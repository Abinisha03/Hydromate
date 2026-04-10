Write-Host "Waiting for EAS build to finish..."
while ($true) {
    # Run eas and capture only the JSON array part (skip cli version warning lines)
    $rawLines = (eas build:list --platform android --limit 1 --json --non-interactive 2>&1)
    $jsonStart = ($rawLines | Select-String '^\[').LineNumber
    if ($jsonStart) {
        $jsonLines = $rawLines[($jsonStart - 1)..($rawLines.Count - 1)] -join "`n"
        $buildInfo = ($jsonLines | ConvertFrom-Json)[0]
        $status = $buildInfo.status
        $queue  = $buildInfo.queuePosition
        Write-Host "Build status: $status | Queue position: $queue"

        if ($status -eq "FINISHED") {
            $url = $buildInfo.artifacts.buildUrl
            Write-Host "Build done! Downloading APK..."
            Invoke-WebRequest -Uri $url -OutFile "hydromate-release.apk"
            Write-Host "SUCCESS! APK saved as hydromate-release.apk in your project folder!"
            break
        } elseif ($status -eq "ERRORED" -or $status -eq "CANCELLED") {
            Write-Host "Build $status. Please check Expo dashboard for logs."
            break
        } else {
            Write-Host "Still building... Checking again in 60 seconds"
            Start-Sleep -Seconds 60
        }
    } else {
        Write-Host "Could not parse response, retrying in 60 seconds..."
        Start-Sleep -Seconds 60
    }
}
