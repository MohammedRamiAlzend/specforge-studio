$ErrorActionPreference = 'Stop'
$base = 'http://127.0.0.1:3000'
$email = 'mouazalkhatib2022@gmail.com'
$password = 'password123'
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$tracePath = Join-Path (Resolve-Path '.').Path 'ops\workflow-trace.txt'
Set-Content -Path $tracePath -Value "Workflow started $(Get-Date -Format o)"

function Invoke-Json($method, $path, $body = $null) {
  Add-Content -Path $tracePath -Value "REQUEST $method $path"
  Write-Output "REQUEST $method $path"
  $params = @{ Uri = "$base$path"; Method = $method; WebSession = $session; ContentType = 'application/json' }
  if ($null -ne $body) { $params.Body = ($body | ConvertTo-Json -Depth 10) }
  try {
    return Invoke-RestMethod @params
  } catch {
    Add-Content -Path $tracePath -Value "FAILED $method $path : $($_.Exception.Message)"
    Write-Output "FAILED $method $path : $($_.Exception.Message)"
    if ($_.Exception.Response) {
      $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
      $errorBody = $reader.ReadToEnd()
      Add-Content -Path $tracePath -Value ("ERROR_BODY " + $errorBody)
      Write-Output ("ERROR_BODY " + $errorBody)
    }
    throw
  }
}

$login = Invoke-Json 'POST' '/auth/login' @{ email = $email; password = $password }
$user = $login.data.user

$projects = Invoke-Json 'GET' '/projects'
$project = $projects.data | Select-Object -First 1
if ($null -eq $project) { throw 'No existing project was found for the signed-in user.' }
$projectId = $project.id
$projectName = $project.name

$notes = @(
  @{ block = 'key_partners'; content = 'Cloud observability vendors and implementation partners'; color = 'blue' },
  @{ block = 'key_activities'; content = 'Ingest signals, correlate incidents, and coach teams through recovery'; color = 'green' },
  @{ block = 'key_resources'; content = 'Event pipeline, domain experts, and benchmark dataset'; color = 'yellow' },
  @{ block = 'value_propositions'; content = 'Turn noisy production signals into an actionable operating rhythm'; color = 'purple' },
  @{ block = 'customer_relationships'; content = 'Weekly reliability reviews plus contextual in-product guidance'; color = 'pink' },
  @{ block = 'channels'; content = 'Product-led onboarding, technical communities, and partner referrals'; color = 'orange' },
  @{ block = 'customer_segments'; content = 'Platform teams at growing SaaS companies with 10–100 engineers'; color = 'blue' },
  @{ block = 'cost_structure'; content = 'Event storage, signal processing, customer success, and security'; color = 'pink' },
  @{ block = 'revenue_streams'; content = 'Seat-based subscription with usage-aware enterprise tiers'; color = 'green' }
)
$existingBmc = (Invoke-Json 'GET' "/bmc?project=$projectId").data
foreach ($note in $notes) {
  $alreadyThere = $existingBmc | Where-Object { $_.block -eq $note.block -and $_.content -eq $note.content }
  if ($null -eq $alreadyThere) {
    $note.project_id = $projectId
    $null = Invoke-Json 'POST' '/bmc' $note
  }
}

$bmc = Invoke-Json 'GET' "/bmc?project=$projectId"
$presentation = Invoke-Json 'GET' "/presentation/$projectId/data"
$docs = Invoke-Json 'POST' '/docs/generate' @{ project_id = $projectId }
$exports = Invoke-Json 'GET' "/docs/exports?project=$projectId"
$latestExport = $exports.data | Select-Object -First 1
$zipPath = Join-Path (Resolve-Path '.').Path "ops\$projectId-workspace.zip"
$download = Invoke-WebRequest -Uri "$base/docs/exports/$($latestExport.id)/download" -WebSession $session -OutFile $zipPath

[ordered]@{
  signed_in = $true
  user_email = $user.email
  project_created = $false
  project_id = $projectId
  project_name = $projectName
  bmc_note_count = $bmc.data.Count
  bmc_blocks = @($bmc.data | ForEach-Object { $_.block } | Sort-Object -Unique)
  presentation_slide_count = $presentation.data.slides.Count
  presentation_title = $presentation.data.project.name
  markdown_export_id = $docs.data.id
  markdown_file_count = $docs.data.file_count
  markdown_files = @($docs.data.files | ForEach-Object { $_.path })
  workspace_zip = $zipPath
  workspace_zip_bytes = (Get-Item $zipPath).Length
  bmc_direct_json_available = $true
  bmc_direct_markdown_available = $false
} | ConvertTo-Json -Depth 6
