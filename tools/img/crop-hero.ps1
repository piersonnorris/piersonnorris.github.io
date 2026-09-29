# Crop the home hero photo into the 2:3 portrait slot, at two sizes.
#
# Source (not committed — 22 MB): Wikimedia Commons,
#   "Chicago Lakefront Sunset - Lake Michigan Harbor" by Tony Webster, CC BY 2.0
#   https://commons.wikimedia.org/wiki/File:Chicago_Lakefront_Sunset_-_Lake_Michigan_Harbor.jpg
#   https://upload.wikimedia.org/wikipedia/commons/0/0a/Chicago_Lakefront_Sunset_-_Lake_Michigan_Harbor.jpg
#
# The crop is full height, 2:3 wide, and starts 55.5% of the way across. That
# keeps Navy Pier and the open sky and leaves the speedboat (and the people in
# it) out of frame — the photo is of the lake, not of strangers.
# CC BY 2.0 permits the crop; the credit on the page says it was cropped.
#
#   powershell -ExecutionPolicy Bypass -File tools\img\crop-hero.ps1 -Source <original.jpg>
#
# Writes assets\img\home\lake-sunset-800.jpg and lake-sunset-480.jpg.

param(
  [Parameter(Mandatory = $true)][string]$Source,
  [double]$Left = 0.555,
  [int]$Quality = 76
)

Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$out = Join-Path $root 'assets\img\home'

$jpeg = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
  Where-Object { $_.MimeType -eq 'image/jpeg' }
$params = New-Object System.Drawing.Imaging.EncoderParameters 1
$params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
  [System.Drawing.Imaging.Encoder]::Quality, [long]$Quality)

$src = [System.Drawing.Image]::FromFile((Resolve-Path $Source))
try {
  $h = $src.Height
  $w = [int][math]::Round($h * 2 / 3)
  $x = [int][math]::Round($src.Width * $Left)
  if ($x + $w -gt $src.Width) { $x = $src.Width - $w }
  $crop = New-Object System.Drawing.Rectangle $x, 0, $w, $h

  foreach ($width in 800, 480) {
    $height = [int]($width * 3 / 2)
    $bmp = New-Object System.Drawing.Bitmap $width, $height
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = 'HighQualityBicubic'
    $g.PixelOffsetMode = 'HighQuality'
    $g.SmoothingMode = 'HighQuality'
    $g.DrawImage($src, (New-Object System.Drawing.Rectangle 0, 0, $width, $height), $crop, 'Pixel')
    $g.Dispose()
    $file = Join-Path $out "lake-sunset-$width.jpg"
    $bmp.Save($file, $jpeg, $params)
    $bmp.Dispose()
    '{0}  {1}x{2}  {3:N0} KB' -f (Split-Path -Leaf $file), $width, $height, ((Get-Item $file).Length / 1KB)
  }
} finally {
  $src.Dispose()
}
