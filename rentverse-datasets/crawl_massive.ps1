# crawl_massive.ps1

# 1. All Supported Regions (from params.py)
$regions = @(
    "kuala-lumpur", "selangor", "penang", "johor", 
    "putrajaya", "sabah", "sarawak", "melaka", 
    "negeri-sembilan", "pahang", "perak", "kedah", 
    "kelantan", "terengganu", "perlis", "labuan"
)

# 2. Specific Property Types (Drill-down strategy)
# We EXCLUDE "property" (generic) to avoid shallow results.
# We focus on specific types to maximize depth per category.
$types = @(
    "condo", 
    "apartment", 
    "house", 
    "townhouse", 
    "villa", 
    "penthouse"
)

Write-Host " Starting DEEP MASSIVE Crawl for Rentverse..." 
Write-Host " Target: $(($regions.Count * $types.Count)) Combinations"

foreach ($region in $regions) {
    foreach ($type in $types) {
        $timestamp = Get-Date -Format "HH:mm:ss"
        Write-Host "[$timestamp] 🕷️ Scraping: $type in $region..." -NoNewline
        
        # Run Scrapy
        # We append to the same 'rentals.csv' file automatically
        # scrapy crawl fazwazrent -a region=$region -a property_type=$type
        & "C:\Users\User\AppData\Roaming\Python\Scripts\poetry" run scrapy crawl fazwazrent -a region=$region -a property_type=$type

        Write-Host " DONE" 
        
        # Polite delay to prevent IP Ban
        Start-Sleep -Seconds 2
    }
    # Longer pause between switching regions
    Write-Host " Resting 5 seconds before switching regions..."
    Start-Sleep -Seconds 5
}

Write-Host "`n Crawl Finished! ALL data saved to 'rentals.csv'."