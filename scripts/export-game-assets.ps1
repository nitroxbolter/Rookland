param(
  [string]$OutputDirectory = (Join-Path (Split-Path $PSScriptRoot -Parent) 'Assets-PNG-Exportados')
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$root = Split-Path $PSScriptRoot -Parent
$sprites = Join-Path $root 'web/public/spritesheets'
$output = [System.IO.Path]::GetFullPath($OutputDirectory)
$imageFormat = [System.Drawing.Imaging.ImageFormat]::Png
$pixelFormat = [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
$exported = [System.Collections.Generic.List[string]]::new()

function Save-Crop([string]$sourceRelative, [string]$destinationRelative, [int]$x, [int]$y, [int]$width, [int]$height) {
  $sourcePath = Join-Path $sprites $sourceRelative
  $destinationPath = Join-Path $output $destinationRelative
  [System.IO.Directory]::CreateDirectory((Split-Path $destinationPath -Parent)) | Out-Null
  $source = [System.Drawing.Bitmap]::new($sourcePath)
  try {
    if ($x -lt 0 -or $y -lt 0 -or $width -lt 1 -or $height -lt 1 -or $x + $width -gt $source.Width -or $y + $height -gt $source.Height) {
      throw "Recorte inválido: $sourceRelative ($x,$y,$width,$height)"
    }
    $result = [System.Drawing.Bitmap]::new($width, $height, $pixelFormat)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($result)
      try {
        $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
        $graphics.DrawImage($source, [System.Drawing.Rectangle]::new(0, 0, $width, $height), [System.Drawing.Rectangle]::new($x, $y, $width, $height), [System.Drawing.GraphicsUnit]::Pixel)
      } finally { $graphics.Dispose() }
      $result.Save($destinationPath, $imageFormat)
      $exported.Add($destinationRelative)
    } finally { $result.Dispose() }
  } finally { $source.Dispose() }
}

function Copy-Png([string]$sourcePath, [string]$destinationRelative) {
  $destinationPath = Join-Path $output $destinationRelative
  [System.IO.Directory]::CreateDirectory((Split-Path $destinationPath -Parent)) | Out-Null
  Copy-Item -LiteralPath $sourcePath -Destination $destinationPath -Force
  $exported.Add($destinationRelative)
}

function Save-Svg([string]$name, [string]$destinationRelative) {
  $chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
  if (-not (Test-Path -LiteralPath $chrome)) { throw 'Chrome não encontrado para converter os vetores SVG.' }
  $sourcePath = Join-Path $sprites "village/$name.svg"
  [xml]$svg = Get-Content -LiteralPath $sourcePath -Raw
  $width = [int]$svg.svg.width
  $height = [int]$svg.svg.height
  $temporary = Join-Path $output '_conversao-svg'
  [System.IO.Directory]::CreateDirectory($temporary) | Out-Null
  $capture = Join-Path $temporary "$name.png"
  $profile = Join-Path $temporary 'chrome-profile'
  $uri = [System.Uri]::new($sourcePath).AbsoluteUri
  try {
    $ErrorActionPreference = 'Continue'
    & $chrome '--headless=new' '--disable-gpu' '--no-sandbox' '--disable-extensions' "--user-data-dir=$profile" '--hide-scrollbars' '--force-device-scale-factor=1' '--window-size=256,256' "--screenshot=$capture" $uri 2>$null | Out-Null
  } finally { $ErrorActionPreference = 'Stop' }
  if (-not (Test-Path -LiteralPath $capture)) { throw "Falhou a conversão de $name.svg para PNG." }
  $screenshot = [System.Drawing.Bitmap]::new($capture)
  try {
    $result = [System.Drawing.Bitmap]::new($width, $height, $pixelFormat)
    try {
      for ($y = 0; $y -lt $height; $y++) {
        for ($x = 0; $x -lt $width; $x++) {
          $color = $screenshot.GetPixel($x, $y)
          if ($color.R -eq 255 -and $color.G -eq 255 -and $color.B -eq 255) { continue }
          $result.SetPixel($x, $y, $color)
        }
      }
      $destinationPath = Join-Path $output $destinationRelative
      [System.IO.Directory]::CreateDirectory((Split-Path $destinationPath -Parent)) | Out-Null
      $result.Save($destinationPath, $imageFormat)
      $exported.Add($destinationRelative)
    } finally { $result.Dispose() }
  } finally { $screenshot.Dispose() }
}

[System.IO.Directory]::CreateDirectory($output) | Out-Null

# Guardar as folhas PNG originais, além dos recortes prontos para uso.
foreach ($folder in @('village', 'resources')) {
  Get-ChildItem -LiteralPath (Join-Path $sprites $folder) -Filter '*.png' -File | ForEach-Object {
    Copy-Png $_.FullName "folhas-originais/$folder/$($_.Name)"
  }
}
Copy-Png (Join-Path $sprites 'cropsV2.png') 'folhas-originais/cropsV2.png'

foreach ($name in @('blacksmith', 'weaving', 'barracks')) {
  Copy-Png (Join-Path $sprites "village/$name.png") "estruturas/$name.png"
}
foreach ($entry in @(
  @('house-levels', 'casa', 3),
  @('ranch-levels', 'curral', 5),
  @('wall-levels', 'muro-horizontal', 3),
  @('wall-levels-vertical', 'muro-vertical', 3),
  @('gate-levels', 'portao', 3),
  @('tower-levels', 'torre', 3),
  @('soldier-directions', 'soldado', 4)
)) {
  $sheet = [System.Drawing.Bitmap]::new((Join-Path $sprites "village/$($entry[0]).png"))
  try { $sheetWidth = $sheet.Width; $sheetHeight = $sheet.Height } finally { $sheet.Dispose() }
  $count = [int]$entry[2]
  for ($index = 0; $index -lt $count; $index++) {
    $left = [int][math]::Round($index * $sheetWidth / $count)
    $right = [int][math]::Round(($index + 1) * $sheetWidth / $count)
    $label = if ($entry[0] -eq 'soldier-directions') { @('frente', 'esquerda', 'costas', 'direita')[$index] } else { "nivel-$($index + 1)" }
    $category = if ($entry[0] -eq 'soldier-directions') { 'personagens' } else { 'estruturas' }
    Save-Crop "village/$($entry[0]).png" "$category/$($entry[1])-$label.png" $left 0 ($right - $left) $sheetHeight
  }
}

$villageAtlas = @{
  'centro-urbano-nivel-1' = @(20, 15, 325, 305)
  'centro-urbano-nivel-2' = @(370, 10, 325, 310)
  'centro-urbano-nivel-3' = @(713, 10, 357, 312)
  'celeiro-nivel-1' = @(20, 390, 328, 255)
  'celeiro-nivel-2' = @(355, 385, 337, 260)
  'celeiro-nivel-3' = @(710, 385, 360, 260)
  'poco' = @(1213, 187, 155, 170)
  'aldeao-frente' = @(28, 758, 78, 151)
  'aldeao-esquerda' = @(108, 758, 82, 151)
  'aldeao-direita' = @(195, 758, 82, 151)
  'explorador-frente' = @(414, 758, 84, 151)
  'explorador-esquerda' = @(500, 758, 82, 151)
  'explorador-direita' = @(583, 758, 82, 151)
  'galinha' = @(1096, 480, 60, 70)
  'vaca' = @(1093, 553, 63, 84)
  'porco' = @(1095, 642, 60, 72)
  'ovelha' = @(1088, 713, 68, 80)
}
foreach ($name in $villageAtlas.Keys) {
  $category = if ($name -match '^(aldeao|explorador|galinha|vaca|porco|ovelha)') { 'personagens' } else { 'estruturas' }
  $rect = $villageAtlas[$name]
  Save-Crop 'village/village-atlas.png' "$category/$name.png" $rect[0] $rect[1] $rect[2] $rect[3]
}

foreach ($name in @('stone-deposit', 'gold-deposit', 'iron-deposit')) {
  Copy-Png (Join-Path $sprites "resources/$name.png") "recursos/$name.png"
}
Get-ChildItem -LiteralPath (Join-Path $sprites 'village/farmer') -Filter '*.png' -File | ForEach-Object {
  Copy-Png $_.FullName "personagens/aldeao-animacoes/$($_.Name)"
}
$resourceAtlas = Join-Path $sprites 'resources/village-resource-atlas.png'
$resourceSheet = [System.Drawing.Bitmap]::new($resourceAtlas)
try { $atlasWidth = $resourceSheet.Width; $atlasHeight = $resourceSheet.Height } finally { $resourceSheet.Dispose() }
$rows = @('arvore', 'pedra', 'ouro', 'arbusto-frutas')
$rowEdges = @(0, 350, 620, 920, $atlasHeight)
for ($row = 0; $row -lt 4; $row++) {
  for ($column = 0; $column -lt 4; $column++) {
    $left = [int][math]::Round($column * $atlasWidth / 4)
    $right = [int][math]::Round(($column + 1) * $atlasWidth / 4)
    $top = $rowEdges[$row]
    $bottom = $rowEdges[$row + 1]
    Save-Crop 'resources/village-resource-atlas.png' "recursos/$($rows[$row])-variante-$($column + 1).png" $left $top ($right - $left) ($bottom - $top)
  }
}

# As três plantações usadas pela vila ocupam linhas de 16 px na folha de culturas.
$cropText = Get-Content -LiteralPath (Join-Path $root 'shared/src/engine/data/cropsData.ts') -Raw
$cropMatches = [regex]::Matches($cropText, 'id:\s*"([^"]+-crop)"[\s\S]*?tallStages:\s*\[([^\]]*)\]')
$rowY = 0
foreach ($match in $cropMatches) {
  $cropId = $match.Groups[1].Value
  $rowHeight = if ($match.Groups[2].Value.Trim()) { 32 } else { 16 }
  $cropName = @{ 'carrot-crop' = 'cenoura'; 'wheat-crop' = 'trigo'; 'potato-crop' = 'batata' }[$cropId]
  if ($cropName) {
    Save-Crop 'cropsV2.png' "recursos/culturas/$cropName-folha.png" 0 $rowY 256 $rowHeight
    $frames = @(@(0, 'semente'), @(1, 'plantada'), @(8, 'plantada-regada'), @(15, 'colheita'))
    for ($stage = 1; $stage -le 5; $stage++) {
      $frames += ,@(($stage + 1), "fase-$stage")
      $frames += ,@(($stage + 8), "fase-$stage-regada")
    }
    foreach ($frame in $frames) {
      Save-Crop 'cropsV2.png' "recursos/culturas/$cropName-$($frame[1]).png" ([int]$frame[0] * 16) $rowY 16 $rowHeight
    }
  }
  $rowY += $rowHeight
}

Save-Svg 'branches' 'recursos/galhos.png'
Save-Svg 'barn' 'estruturas/legado/celeiro-vetor.png'
Save-Svg 'cabin' 'estruturas/legado/cabana-vetor.png'
Save-Svg 'villager' 'personagens/legado/aldeao-vetor.png'
Save-Svg 'hero' 'personagens/legado/heroi-vetor.png'
$temporary = Join-Path $output '_conversao-svg'
if ([System.IO.Path]::GetFullPath($temporary).StartsWith($output + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
  Remove-Item -LiteralPath $temporary -Recurse -Force
}

$readme = @'
Assets PNG exportados do RookLand

estruturas/    Construções isoladas e cada nível de casa, curral, muro, portão e torre.
recursos/      Árvores, depósitos, arbustos, galhos e estágios das culturas usadas na vila.
personagens/   Aldeão, explorador, soldado e animais, separados por direção.
folhas-originais/  Cópias PNG das folhas completas, sem alterar os arquivos do jogo.

As imagens separadas mantêm a resolução e a transparência de origem. O jogo reduz
esses arquivos via CSS; algumas folhas são grandes para permitir edição posterior.
Os PNGs em legado/ são conversões dos SVGs antigos presentes no projeto.

Para atualizar esta pasta após trocar assets, execute:
powershell -ExecutionPolicy Bypass -File scripts/export-game-assets.ps1
'@
[System.IO.File]::WriteAllText((Join-Path $output 'LEIA-ME.txt'), $readme, [System.Text.Encoding]::UTF8)
Write-Output "Exportados $($exported.Count) arquivos PNG em $output"
