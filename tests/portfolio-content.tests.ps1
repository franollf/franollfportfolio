$ErrorActionPreference = "Stop"

$html = Get-Content -Raw (Join-Path $PSScriptRoot "..\index.html")
$css = Get-Content -Raw (Join-Path $PSScriptRoot "..\styles.css")
$js = Get-Content -Raw (Join-Path $PSScriptRoot "..\script.js")
$pokevaultCard = [regex]::Match($html, '<!-- PokéVault -->(.*?)<!-- Safe Rx -->', 'Singleline').Groups[1].Value
$failures = [System.Collections.Generic.List[string]]::new()

function Assert-Contains([string]$Content, [string]$Needle, [string]$Message) {
  if (-not $Content.Contains($Needle)) {
    $failures.Add($Message)
  }
}

function Assert-NotContains([string]$Content, [string]$Needle, [string]$Message) {
  if ($Content.Contains($Needle)) {
    $failures.Add($Message)
  }
}

Assert-Contains $html 'src="photos/transparentpfp.png"' "About portrait should use transparentpfp.png."
Assert-Contains $html 'src="photos/shared services team.jpg"' "Collage should include the Shared Services bowling photo."
Assert-Contains $html 'data-caption="Bowling social with the CanAI Garage Vancouver team!"' "Bowling photo should have the requested caption."
Assert-Contains $html 'src="photos/fullmarathon.JPG"' "Collage should include fullmarathon.JPG."
Assert-Contains $html 'src="photos/rumble.jpeg"' "Collage should include rumble.jpeg."
Assert-Contains $html 'data-caption="Boxing with family."' "Boxing photo should mention family."
Assert-Contains $html 'data-caption="My first half marathon ever!"' "Solo finish photo should describe the first half marathon."
Assert-NotContains $html 'src="photos/marathonphoto.JPG"' "The replaced marathon photo should be removed from the collage."
Assert-NotContains $html 'src="photos/volleyball.JPG"' "The volleyball photo should be removed from the collage."
Assert-NotContains $html 'src="photos/dinner.jpg"' "The dinner photo should be replaced in the collage."

@('gallery-full-marathon', 'gallery-church', 'gallery-half-marathon') | ForEach-Object {
  Assert-Contains $html $_ "Collage should include the $_ focal-point class."
}
Assert-Contains $css 'object-fit: contain;' "Portrait should remain uncropped."

Assert-Contains $html '<h3>PokéVault</h3>' "Projects should include a PokéVault card."
Assert-Contains $html 'class="project-preview pokevault-project-preview"' "PokéVault preview should have dedicated centering styles."
Assert-Contains $html 'src="projects/pokevault.png"' "PokéVault should use the supplied project image."
@('Java 21', 'Spring Boot', 'PostgreSQL', 'Docker', 'Spring Data JPA', 'Flyway', 'Testcontainers', 'JUnit', 'Mockito') | ForEach-Object {
  Assert-Contains $html $_ "PokéVault should list $_."
}
@('spring.svg', 'flyway.svg', 'testcontainers.svg', 'junit.svg', 'mockito.png') | ForEach-Object {
  Assert-Contains $pokevaultCard "icons/$_" "PokéVault should display the $_ icon."
}
Assert-Contains $html 'href="https://github.com/franollf/pokevault"' "PokéVault should link to GitHub."
Assert-Contains $html 'href="https://youtu.be/MLe6hXhtoc8"' "PokéVault should link to the demo."
Assert-Contains $html 'rel="noopener noreferrer"' "External project links should protect the opener context."
Assert-NotContains $pokevaultCard '<span>GitHub</span>' "PokéVault GitHub link should be icon-only."
Assert-NotContains $pokevaultCard '<span>Demo</span>' "PokéVault demo link should be icon-only."
Assert-NotContains $css '.pokevault-preview' "Unused generated PokéVault preview styles should be removed."
Assert-Contains $css '.pokevault-project-preview' "PokéVault preview should define dedicated centering styles."

# The mobile menu must never leave a stale inline overflow lock on the page.
Assert-NotContains ($html + $js) 'document.body.style.overflow' "Mobile navigation should not lock scrolling with an inline body style."
Assert-Contains $js 'mobileNav.classList.remove("open")' "Mobile navigation should have an explicit close path."
Assert-Contains $js 'mobileBreakpoint.addEventListener("change", closeMobileNav)' "Crossing the mobile breakpoint should clear an open menu and its scroll lock."
Assert-Contains $css 'body.mobile-nav-open' "The mobile navigation scroll lock should be represented by a removable class."
Assert-NotContains $css 'overflow-x: hidden;' "Horizontal clipping must not create nested vertical scroll containers on mobile."
Assert-Contains $css 'overflow-x: clip;' "Wide content should be clipped without capturing vertical touch scrolling."

if ($failures.Count -gt 0) {
  $failures | ForEach-Object { Write-Error $_ -ErrorAction Continue }
  throw "$($failures.Count) portfolio content assertion(s) failed."
}

Write-Host "All portfolio content assertions passed."
