# Map country data

`countries_v2.geojson` contains the static country polygons used by the map.

`orte.json` contains the static place and storage-location points that can be shown as an alternate map layer.

The current file was regenerated from the previously committed `countries_v2.geojson` with Mapshaper `0.7.20`, simplifying all countries in one run so shared borders stay topologically aligned. This avoids double or offset borders such as the Germany-Netherlands boundary while keeping the existing app runtime unchanged.

The source for this regeneration was the version of this file before the country-boundary simplification change, commit `7527f447dbbdf8afc56b7fbcb50083a608e41dd9`. To repeat the process, write that source version to a temporary file, run Mapshaper, and then replace `countries_v2.geojson` with the generated output:

```powershell
$tmp = Join-Path $env:TEMP ("oge-mapshaper-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
node -e "const fs=require('fs'),cp=require('child_process'); fs.writeFileSync(process.argv[1], cp.execFileSync('git',['show','7527f447dbbdf8afc56b7fbcb50083a608e41dd9:public/data/countries_v2.geojson']));" (Join-Path $tmp "countries_source.geojson")
npx.cmd --yes mapshaper (Join-Path $tmp "countries_source.geojson") snap -clean -simplify 60% keep-shapes -clean -o force format=geojson precision=0.00001 (Join-Path $tmp "countries_out.geojson")
Copy-Item -LiteralPath (Join-Path $tmp "countries_out.geojson") -Destination public/data/countries_v2.geojson -Force
node -e "const fs=require('fs'); const p='public/data/countries_v2.geojson'; fs.writeFileSync(p, JSON.stringify(JSON.parse(fs.readFileSync(p,'utf8')))+'\n');"
Remove-Item -LiteralPath $tmp -Recurse -Force
```

The normalized output created by that command for this change has SHA-256 `67d7115b1f619b597455d6847756ac0356413d4ac6baf45f906f58ecdc76d0f2`.
