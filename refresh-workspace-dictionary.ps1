$ErrorActionPreference = "Stop"

$textFiles = @("Dd.txt", "PY-Pt4.txt", "WZ.txt", "NM.txt") + @(Get-ChildItem -Name "*-data.json")
$wordPattern = "[\p{L}\p{M}\p{N}=_-]+"
$vocabulary = [System.Collections.Generic.HashSet[string]]::new()

function Get-LookupForms {
  param([string]$Value)

  $raw = $Value.Trim()
  if (-not $raw) {
    return @()
  }

  $forms = [System.Collections.Generic.HashSet[string]]::new()
  $lower = $raw.ToLowerInvariant().Trim("-", "=", "_")
  if ($lower) { [void]$forms.Add($lower) }

  $folded = $lower.Normalize([Text.NormalizationForm]::FormD) -replace "\p{M}", ""
  if ($folded) { [void]$forms.Add($folded) }

  foreach ($form in @($lower, $folded)) {
    if (-not $form) { continue }
    foreach ($variant in @(
      ($form -replace "^=+", ""),
      ($form -replace "^u-", ""),
      ($form -replace "^i-", ""),
      ($form -replace "^pad-", ""),
      ($form -replace "^az-", ""),
      ($form -replace "^o-", ""),
      ($form -replace "^ud-", ""),
      ($form -replace "-(iz|is|im|it|san|man|tan)$", "")
    )) {
      $clean = $variant.Trim("-", "=", "_")
      if ($clean) { [void]$forms.Add($clean) }
    }
  }

  return @($forms)
}

foreach ($file in $textFiles) {
  if (-not (Test-Path $file)) {
    continue
  }

  $text = [System.IO.File]::ReadAllText((Join-Path (Get-Location) $file))
  foreach ($match in [regex]::Matches($text, $wordPattern)) {
    foreach ($token in Get-LookupForms $match.Value) {
      if ($token.Length -ge 2 -and -not ($token -match "^\d")) {
        [void]$vocabulary.Add($token)
      }
    }
  }
}

$vocabularyOut = [ordered]@{
  generatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  count = $vocabulary.Count
  words = @($vocabulary | Sort-Object)
}
[System.IO.File]::WriteAllText(
  (Join-Path (Get-Location) "workspace-vocabulary.json"),
  ($vocabularyOut | ConvertTo-Json -Depth 4),
  [System.Text.UTF8Encoding]::new($false)
)

$entries = @{}
$baseUrl = "https://www.mpcorpus.org/api/lemmas/?page_size=1000"
$page = 1
$retryLimit = 3

do {
  $attempt = 0
  do {
    try {
      Write-Output "Scanning MPCD lemma page $page"
      $data = Invoke-RestMethod -Uri "$baseUrl&page=$page" -TimeoutSec 90
      break
    } catch {
      $attempt++
      if ($attempt -ge $retryLimit) {
        throw
      }
      Start-Sleep -Seconds (5 * $attempt)
    }
  } while ($true)

  foreach ($lemma in $data.results) {
    $forms = [System.Collections.Generic.List[string]]::new()
    if ($lemma.word) { $forms.Add([string]$lemma.word) }
    if ($lemma.headword) { $forms.Add([string]$lemma.headword) }
    if ($lemma.stems) {
      foreach ($stem in $lemma.stems) {
        if ($stem) { $forms.Add([string]$stem) }
      }
    }

    $senses = @()
    if ($lemma.related_senses) {
      $senses = @($lemma.related_senses |
        Where-Object { $_.language -eq "eng" -and $_.sense } |
        ForEach-Object { [string]$_.sense })
    }
    if (-not $senses.Length) {
      continue
    }

    foreach ($form in ($forms | Select-Object -Unique)) {
      $word = $form.Trim()
      if (-not $word) {
        continue
      }

      $keys = Get-LookupForms $word
      if (-not ($keys | Where-Object { $vocabulary.Contains($_) })) {
        continue
      }

      if (-not $entries.ContainsKey($word)) {
        $entries[$word] = [System.Collections.Generic.HashSet[string]]::new()
      }
      foreach ($sense in $senses) {
        [void]$entries[$word].Add($sense.Trim())
      }
    }
  }

  $page++
} while ($data.next)

$dictionaryOut = [ordered]@{
  source = "MPCD REST API lemmas endpoint, filtered to local workspace vocabulary"
  sourceUrl = "https://www.mpcorpus.org/api/lemmas/"
  dictionaryUrl = "https://www.mpcorpus.org/dict/1c97e496-4f82-4896-ae04-d562727c5161/"
  generatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  workspaceVocabularyFile = "workspace-vocabulary.json"
  workspaceVocabularyCount = $vocabulary.Count
  matchedEntryCount = $entries.Count
  entries = @($entries.GetEnumerator() | Sort-Object Name | ForEach-Object {
    [ordered]@{
      word = $_.Key
      meanings = @($_.Value | Sort-Object)
    }
  })
}

[System.IO.File]::WriteAllText(
  (Join-Path (Get-Location) "mpcd-workspace-dictionary.json"),
  ($dictionaryOut | ConvertTo-Json -Depth 6),
  [System.Text.UTF8Encoding]::new($false)
)

Write-Output "Wrote $($entries.Count) MPCD dictionary entries for $($vocabulary.Count) workspace words."
