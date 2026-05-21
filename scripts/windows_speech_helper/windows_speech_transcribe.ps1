param(
  [Parameter(Mandatory=$true)]
  [string]$AudioPath,

  [Parameter(Mandatory=$false)]
  [string]$Locale = "en-US"
)

$ErrorActionPreference = "Stop"

if (-not [System.IO.File]::Exists($AudioPath)) {
  throw "Audio file not found: $AudioPath"
}

Add-Type -AssemblyName System.Speech

$culture = [System.Globalization.CultureInfo]::GetCultureInfo($Locale)
$recognizers = [System.Speech.Recognition.SpeechRecognitionEngine]::InstalledRecognizers()
$recognizerInfo = $recognizers | Where-Object { $_.Culture.Name -eq $culture.Name } | Select-Object -First 1

if ($null -eq $recognizerInfo) {
  throw "No installed Windows Speech recognizer for locale $Locale."
}

$engine = [System.Speech.Recognition.SpeechRecognitionEngine]::new($recognizerInfo)
try {
  $engine.LoadGrammar([System.Speech.Recognition.DictationGrammar]::new())
  $engine.SetInputToWaveFile($AudioPath)
  $result = $engine.Recognize([TimeSpan]::FromSeconds(30))
  if ($null -ne $result) {
    Write-Output $result.Text
  }
} finally {
  $engine.Dispose()
}
