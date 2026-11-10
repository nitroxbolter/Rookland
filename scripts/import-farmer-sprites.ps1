param(
  [string]$WalkingSheet = 'D:\Usuario\Downloads\Folha de Sprites do Fazendeiro Pixel Art.png',
  [string]$WorkSheet = 'D:\Usuario\Downloads\Sprite de Fazendeiro com Ferramentas em Pixel Art.png'
)

$ErrorActionPreference = 'Stop'
$destination = Join-Path (Split-Path $PSScriptRoot -Parent) 'web/public/spritesheets/village/farmer'
[System.IO.Directory]::CreateDirectory($destination) | Out-Null

Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;

public static class FarmerSheetCutter {
  const int FrameWidth = 260;
  const int FrameHeight = 350;

  public static void Export(string sourcePath, string outputPath, Rectangle first, Rectangle second, float scale, bool mirror) {
    using (var source = new Bitmap(sourcePath))
    using (var strip = new Bitmap(FrameWidth * 2, FrameHeight, PixelFormat.Format32bppArgb)) {
      using (var canvas = Graphics.FromImage(strip)) {
        canvas.Clear(Color.Transparent);
        canvas.InterpolationMode = InterpolationMode.NearestNeighbor;
        canvas.PixelOffsetMode = PixelOffsetMode.Half;
        DrawFrame(source, canvas, first, 0, scale, mirror);
        DrawFrame(source, canvas, second, FrameWidth, scale, mirror);
      }
      strip.Save(outputPath, ImageFormat.Png);
    }
  }

  public static void ExportAxe(string walkingPath, string toolPath, string outputPath, string direction) {
    using (var walking = new Bitmap(walkingPath))
    using (var tools = new Bitmap(toolPath))
    using (var result = new Bitmap(FrameWidth * 2, FrameHeight, PixelFormat.Format32bppArgb)) {
      using (var canvas = Graphics.FromImage(result)) {
        canvas.Clear(Color.Transparent);
        canvas.InterpolationMode = InterpolationMode.NearestNeighbor;
        canvas.PixelOffsetMode = PixelOffsetMode.Half;
        canvas.DrawImageUnscaled(walking, 0, 0);
        for (int frame = 0; frame < 2; frame++) {
          int x = direction == "left" ? (frame == 0 ? 18 : 4) : (frame == 0 ? 145 : 174);
          int y = frame == 0 ? 190 : 58;
          int size = frame == 0 ? 96 : 80;
          canvas.DrawImage(tools, new Rectangle(frame * FrameWidth + x, y, size, size),
            new Rectangle(frame * 16, 0, 16, 16), GraphicsUnit.Pixel);
        }
      }
      result.Save(outputPath, ImageFormat.Png);
    }
  }

  static void DrawFrame(Bitmap source, Graphics canvas, Rectangle cell, int xOffset, float scale, bool mirror) {
    int left = cell.Right, top = cell.Bottom, right = cell.Left - 1, bottom = cell.Top - 1;
    for (int y = cell.Top; y < cell.Bottom; y++)
      for (int x = cell.Left; x < cell.Right; x++) {
        var color = source.GetPixel(x, y);
        if (Math.Max(color.R, Math.Max(color.G, color.B)) <= 24) continue;
        left = Math.Min(left, x); top = Math.Min(top, y);
        right = Math.Max(right, x); bottom = Math.Max(bottom, y);
      }
    if (right < left) throw new InvalidOperationException("Quadro vazio: " + cell);
    left = Math.Max(cell.Left, left - 5); top = Math.Max(cell.Top, top - 5);
    right = Math.Min(cell.Right - 1, right + 5); bottom = Math.Min(cell.Bottom - 1, bottom + 5);
    int width = right - left + 1, height = bottom - top + 1;
    using (var cut = new Bitmap(width, height, PixelFormat.Format32bppArgb)) {
      for (int y = 0; y < height; y++)
        for (int x = 0; x < width; x++) {
          var c = source.GetPixel(left + x, top + y);
          int brightness = Math.Max(c.R, Math.Max(c.G, c.B));
          if (brightness <= 6) continue;
          int alpha = brightness >= 22 ? 255 : (brightness - 6) * 255 / 16;
          cut.SetPixel(x, y, Color.FromArgb(alpha, c.R, c.G, c.B));
        }
      int outWidth = Math.Min(FrameWidth - 12, (int)Math.Round(width * scale));
      int outHeight = Math.Min(FrameHeight - 8, (int)Math.Round(height * scale));
      int outX = xOffset + (FrameWidth - outWidth) / 2;
      int outY = FrameHeight - outHeight - 4;
      var dest = new Rectangle(outX, outY, outWidth, outHeight);
      if (mirror) {
        canvas.TranslateTransform(outX + outWidth, 0);
        canvas.ScaleTransform(-1, 1);
        canvas.DrawImage(cut, new Rectangle(0, outY, outWidth, outHeight));
        canvas.ResetTransform();
      } else canvas.DrawImage(cut, dest);
    }
  }
}
'@

$walkX = @(0, 475, 800, 1100, 1536)
$walkY = @(0, 380, 735)
$workX = @(0, 220, 420, 610, 805, 990, 1180, 1370, 1536)
$workY = @(0, 350, 680, 1024)
function Cell([int[]]$xs, [int[]]$ys, [int]$column, [int]$row) {
  return [System.Drawing.Rectangle]::new($xs[$column], $ys[$row], $xs[$column + 1] - $xs[$column], $ys[$row + 1] - $ys[$row])
}

foreach ($direction in @(
  @{ name = 'down'; row = 0; column = 0; mirror = $false },
  @{ name = 'up'; row = 0; column = 2; mirror = $false },
  @{ name = 'left'; row = 1; column = 0; mirror = $false },
  @{ name = 'right'; row = 1; column = 2; mirror = $false }
)) {
  [FarmerSheetCutter]::Export($WalkingSheet, (Join-Path $destination "walk-$($direction.name).png"),
    (Cell $walkX $walkY $direction.column $direction.row),
    (Cell $walkX $walkY ($direction.column + 1) $direction.row), 0.94, $direction.mirror)
}

foreach ($activity in @(@{ name = 'mine'; row = 0 }, @{ name = 'hoe'; row = 1 }, @{ name = 'hammer'; row = 2 })) {
  foreach ($direction in @(
    @{ name = 'down'; column = 0; mirror = $false },
    @{ name = 'up'; column = 2; mirror = $false },
    @{ name = 'left'; column = 4; mirror = $true },
    @{ name = 'right'; column = 6; mirror = $false }
  )) {
    [FarmerSheetCutter]::Export($WorkSheet, (Join-Path $destination "$($activity.name)-$($direction.name).png"),
      (Cell $workX $workY $direction.column $activity.row),
      (Cell $workX $workY ($direction.column + 1) $activity.row), 1.2, $direction.mirror)
  }
}
foreach ($direction in @('down', 'up', 'left', 'right')) {
  [FarmerSheetCutter]::ExportAxe((Join-Path $destination "walk-$direction.png"),
    (Join-Path $PSScriptRoot 'farmer-axe-frames.png'),
    (Join-Path $destination "axe-$direction.png"), $direction)
}
Write-Output "20 animacoes PNG geradas em $destination"
