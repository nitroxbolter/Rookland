$ErrorActionPreference = 'Stop'

$drawingDir = Split-Path -Parent ([System.Drawing.Bitmap].Assembly.Location)
Add-Type -ReferencedAssemblies @(
    [System.Drawing.Bitmap].Assembly.Location,
    [System.Drawing.Color].Assembly.Location,
    (Join-Path $drawingDir 'System.Private.Windows.GdiPlus.dll'),
    (Join-Path $drawingDir 'System.Private.Windows.Core.dll')
) -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;

public static class EnemySpritePalette
{
    public static int Recolor(string source, string destination)
    {
        using (var original = new Bitmap(source))
        using (var output = new Bitmap(original.Width, original.Height, PixelFormat.Format32bppArgb))
        {
            int changed = 0;
            for (int y = 0; y < original.Height; y++)
            for (int x = 0; x < original.Width; x++)
            {
                Color pixel = original.GetPixel(x, y);
                if (pixel.A > 0 && pixel.B >= 15 &&
                    pixel.B > pixel.R * 1.25 && pixel.B > pixel.G * 1.20 &&
                    pixel.B - Math.Max(pixel.R, pixel.G) >= 12)
                {
                    int red = Math.Min(255, (int)Math.Round(pixel.B * 1.20));
                    int green = Math.Min(255, (int)Math.Round(pixel.G * 0.42 + pixel.R * 0.10));
                    int blue = Math.Min(255, (int)Math.Round(pixel.R * 0.50));
                    output.SetPixel(x, y, Color.FromArgb(pixel.A, red, green, blue));
                    changed++;
                }
                else output.SetPixel(x, y, pixel);
            }
            output.Save(destination, ImageFormat.Png);
            return changed;
        }
    }
}
'@

$root = Split-Path -Parent $PSScriptRoot
$sprites = Join-Path $root 'web/public/spritesheets/village'
$total = 0
foreach ($kind in @('farmer', 'soldier', 'archer')) {
    $sourceDir = Join-Path $sprites $kind
    $targetDir = Join-Path $sprites ("enemy/$kind")
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    foreach ($source in Get-ChildItem -LiteralPath $sourceDir -Filter 'walk-*.png') {
        $destination = Join-Path $targetDir $source.Name
        $changed = [EnemySpritePalette]::Recolor($source.FullName, $destination)
        if ($changed -eq 0) { throw "Nenhum detalhe azul encontrado em $($source.FullName)" }
        Write-Output "$kind/$($source.Name): $changed pixels azuis alterados"
        $total++
    }
}
Write-Output "$total sprites rivais gerados."
