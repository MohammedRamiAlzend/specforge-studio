$ErrorActionPreference = 'Stop'
$base = 'http://127.0.0.1:5173/api'
$email = 'mouazalkhatib2022@gmail.com'
$password = $env:SPECFORGE_TEST_PASSWORD
if ([string]::IsNullOrWhiteSpace($password)) { throw 'SPECFORGE_TEST_PASSWORD is not set.' }

function Invoke-ApiJson([string]$method, [string]$path, [hashtable]$payload = $null) {
  $params = @{ Uri = "$base$path"; Method = $method; WebSession = $script:session; UseBasicParsing = $true }
  if ($null -ne $payload) {
    $params.ContentType = 'application/json'
    $params.Body = ($payload | ConvertTo-Json -Depth 10 -Compress)
  }
  $response = Invoke-WebRequest @params
  if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) { throw "$method $path returned HTTP $($response.StatusCode)" }
  if ([string]::IsNullOrWhiteSpace($response.Content)) { return $null }
  return ($response.Content | ConvertFrom-Json)
}

$loginBody = @{ email = $email; password = $password } | ConvertTo-Json -Compress
$login = Invoke-WebRequest -Uri "$base/auth/login" -Method POST -Body $loginBody -ContentType 'application/json' -UseBasicParsing -SessionVariable session
if ($login.StatusCode -ne 200) { throw "Login returned HTTP $($login.StatusCode)" }
$loginData = $login.Content | ConvertFrom-Json
Write-Output "SIGNED_IN_USER=$($loginData.data.user.id)"

$projectBody = @{
  name = 'GreenCart Orbit'
  type = 'web'
  description = 'A sustainable commerce operating system that helps independent grocers sell surplus inventory through neighborhood pickup, smart bundles, and measurable waste reduction.'
  created_by = $loginData.data.user.id
}
$projectResponse = Invoke-ApiJson 'POST' '/projects' $projectBody
$project = $projectResponse.data
$projectId = $project.id
Write-Output "PROJECT_ID=$projectId PROJECT_NAME=$($project.name)"

$bmc = @(
  @{ block='key_partners'; content='Independent grocers and neighborhood markets provide surplus inventory and local trust.' },
  @{ block='key_partners'; content='Local delivery cooperatives support low-emission pickup windows.' },
  @{ block='key_partners'; content='Food rescue nonprofits receive unsold bundles and impact reports.' },
  @{ block='key_activities'; content='Forecast demand and assemble flexible surplus bundles each morning.' },
  @{ block='key_activities'; content='Coordinate pickup windows and notify customers when orders are ready.' },
  @{ block='key_activities'; content='Measure avoided waste, repeat purchase behavior, and store sell-through.' },
  @{ block='key_resources'; content='Inventory intelligence, store integrations, customer preference data, and a trusted local brand.' },
  @{ block='key_resources'; content='A reusable pickup workflow with operational playbooks for store teams.' },
  @{ block='key_resources'; content='Impact measurement model for kilograms of food and emissions avoided.' },
  @{ block='value_propositions'; content='Turn surplus food into profitable, convenient neighborhood bundles before it becomes waste.' },
  @{ block='value_propositions'; content='Give shoppers affordable discovery without asking store teams to predict every item in advance.' },
  @{ block='value_propositions'; content='Give grocers a measurable sustainability story tied directly to revenue.' },
  @{ block='customer_relationships'; content='Personalized bundle recommendations based on dietary preferences and pickup habits.' },
  @{ block='customer_relationships'; content='Friendly pickup reminders and transparent substitutions build confidence.' },
  @{ block='customer_relationships'; content='Store dashboards and monthly impact reviews support long-term partners.' },
  @{ block='channels'; content='Mobile-first storefront and QR codes at participating neighborhood stores.' },
  @{ block='channels'; content='Local community partnerships, referral credits, and social proof from early shoppers.' },
  @{ block='channels'; content='Store staff onboarding kits and co-branded pickup signage.' },
  @{ block='customer_segments'; content='Value-conscious households who want affordable fresh food.' },
  @{ block='customer_segments'; content='Eco-conscious urban shoppers who want visible impact from everyday purchases.' },
  @{ block='customer_segments'; content='Independent grocers seeking a practical way to reduce waste and recover margin.' },
  @{ block='cost_structure'; content='Platform engineering, hosting, observability, and store integration maintenance.' },
  @{ block='cost_structure'; content='Customer acquisition, partner onboarding, and local operations support.' },
  @{ block='cost_structure'; content='Payment processing, refunds, pickup support, and impact verification.' },
  @{ block='revenue_streams'; content='A transaction fee on every completed surplus bundle order.' },
  @{ block='revenue_streams'; content='Plus subscription for grocers needing forecasting, integrations, and impact reporting.' },
  @{ block='revenue_streams'; content='Aggregated impact insights for approved sustainability and community programs.' }
)
$index = 0
foreach ($note in $bmc) {
  $index++
  $payload = @{ project_id = $projectId; block = $note.block; content = $note.content; sort_order = $index }
  [void](Invoke-ApiJson 'POST' '/bmc' $payload)
}
Write-Output "BMC_NOTES_CREATED=$($bmc.Count)"

$requirements = @(
  @{ title='Shoppers can browse available surplus bundles by pickup neighborhood.'; priority='must'; criticality='critical'; description='The storefront presents available bundles with price, pickup window, dietary tags, and remaining quantity.'; acceptance_criteria='A shopper can filter by neighborhood, open a bundle, and see its pickup details.' },
  @{ title='Store teams can publish and reserve a surplus bundle in under two minutes.'; priority='must'; criticality='critical'; description='The operational workflow must be fast enough for a busy morning handoff.'; acceptance_criteria='A trained store operator creates a bundle and confirms availability without leaving the workflow.' },
  @{ title='Customers can select a pickup window and receive a confirmation.'; priority='must'; criticality='normal'; description='Pickup coordination is the core trust moment after checkout.'; acceptance_criteria='The order contains a pickup slot and the customer receives a confirmation state.' },
  @{ title='The system recommends bundles using dietary preferences and purchase history.'; priority='should'; criticality='normal'; description='Recommendations improve discovery and reduce browsing friction.'; acceptance_criteria='A returning customer sees at least three relevant recommendations when available.' },
  @{ title='Grocers can view sell-through and avoided-waste metrics.'; priority='must'; criticality='normal'; description='Partners need proof that the program improves margin and impact.'; acceptance_criteria='The dashboard shows bundles sold, revenue recovered, and kilograms diverted.' },
  @{ title='Customers can report a substitution or pickup issue from the order.'; priority='should'; criticality='normal'; description='A lightweight support path prevents small exceptions from eroding trust.'; acceptance_criteria='A customer can report an issue and see a confirmation reference.' },
  @{ title='The platform supports accessible keyboard navigation and readable contrast.'; priority='must'; criticality='normal'; description='The experience should work for a broad range of shoppers and store teams.'; acceptance_criteria='Primary journeys are usable with keyboard focus and meet contrast requirements.' },
  @{ title='Payment and order events are auditable for each completed purchase.'; priority='must'; criticality='critical'; description='Order state changes must be explainable to shoppers and partners.'; acceptance_criteria='Each order exposes a traceable event history with actor and timestamp.' },
  @{ title='Store onboarding includes a guided checklist and sample bundle.'; priority='should'; criticality='normal'; description='A guided first run reduces time to first successful listing.'; acceptance_criteria='A new store can complete setup and publish a sample bundle.' },
  @{ title='Impact reports can be exported as Markdown for partner reviews.'; priority='could'; criticality='normal'; description='Partners can share a portable monthly impact summary.'; acceptance_criteria='An authorized partner can export a dated Markdown report.' }
)
foreach ($requirement in $requirements) {
  $payload = @{ project_id = $projectId; type = 'functional'; priority = $requirement.priority; criticality = $requirement.criticality; title = $requirement.title; description = $requirement.description; acceptance_criteria = $requirement.acceptance_criteria }
  [void](Invoke-ApiJson 'POST' '/requirements' $payload)
}
Write-Output "REQUIREMENTS_CREATED=$($requirements.Count)"

$team = @(
  @{ name='Mouaz Al Khatib'; email=$email; role='product_owner' },
  @{ name='Lina Haddad'; email='lina@example.invalid'; role='engineering_lead' },
  @{ name='Omar Nasser'; email='omar@example.invalid'; role='design_lead' },
  @{ name='Sara Mansour'; email='sara@example.invalid'; role='operations_lead' },
  @{ name='Yousef Rahman'; email='yousef@example.invalid'; role='growth_lead' },
  @{ name='Nour Saleh'; email='nour@example.invalid'; role='impact_analyst' }
)
foreach ($member in $team) {
  $payload = @{ project_id = $projectId; name = $member.name; email = $member.email; role = $member.role }
  [void](Invoke-ApiJson 'POST' '/team' $payload)
}
Write-Output "TEAM_MEMBERS_CREATED=$($team.Count)"

$deck = Invoke-ApiJson 'GET' "/presentation/$projectId/data"
Write-Output "PRESENTATION_SLIDES=$($deck.data.slides.Count)"
Write-Output "PRESENTATION_DATA_READY=true"
