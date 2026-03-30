{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE DeriveGeneric #-}

module Main where

import Network.Wai
import Network.Wai.Handler.Warp
import Network.HTTP.Types.Status (status200)
import Data.ByteString.Lazy as BL (ByteString, fromChunks, toChunks)
import Data.ByteString as BS (ByteString)
import Data.Aeson
import Data.Text (Text)
import Control.Monad
import GHC.Generics

-- =============================================================================
-- AQI Data Types and Algebraic Data Types
-- =============================================================================

data AQICategory = Good | Satisfactory | Moderate | Poor | VeryPoor | Severe | Unknown
  deriving (Show, Eq, Ord)

data AQiRecord = AQiRecord
  { recordDate    :: Text
  , recordAqi     :: Double
  , recordPm25    :: Maybe Double
  , recordPm10    :: Maybe Double
  , recordNo2     :: Maybe Double
  , recordSo2     :: Maybe Double
  , recordCo      :: Maybe Double
  , recordO3      :: Maybe Double
  } deriving (Show, Eq, Generic)

data CityAnalysis = CityAnalysis
  { analysisCity             :: Text
  , analysisAverageAqi       :: Double
  , analysisMaxAqi           :: Double
  , analysisMinAqi           :: Double
  , analysisTrend            :: Text
  , analysisCategoryCounts   :: [(Text, Int)]
  , analysisAlert            :: Text
  , analysisRecommendation   :: Text
  } deriving (Show, Eq, Generic)

data CityComparison = CityComparison
  { comparisonCity1          :: Text
  , comparisonCity2          :: Text
  , comparisonAnalysis1      :: CityAnalysis
  , comparisonAnalysis2      :: CityAnalysis
  , comparisonBetterCity     :: Text
  , comparisonRecommendation :: Text
  } deriving (Show, Eq, Generic)

data AlertInfo = AlertInfo
  { alertCity           :: Text
  , alertMessage        :: Text
  , alertSeverity       :: Text
  , alertMaxAqi         :: Double
  , alertRecommendation :: Text
  } deriving (Show, Eq, Generic)

-- =============================================================================
-- JSON Parsing with Aeson
-- =============================================================================

instance FromJSON AQiRecord where
  parseJSON = withObject "AQiRecord" $ \v -> AQiRecord
    <$> v .: "date"
    <*> v .: "aqi"
    <*> v .:? "pm25"
    <*> v .:? "pm10"
    <*> v .:? "no2"
    <*> v .:? "so2"
    <*> v .:? "co"
    <*> v .:? "o3"

instance ToJSON AQiRecord where
  toJSON (AQiRecord date aqi pm25 pm10 no2 so2 co o3) = object
    [ "date" .= date
    , "aqi" .= aqi
    , "pm25" .= pm25
    , "pm10" .= pm10
    , "no2" .= no2
    , "so2" .= so2
    , "co" .= co
    , "o3" .= o3
    ]

instance ToJSON CityAnalysis
instance ToJSON CityComparison
instance ToJSON AlertInfo

-- =============================================================================
-- AQI Classification - Core Haskell Pattern Matching
-- =============================================================================

classifyAQI :: Double -> AQICategory
classifyAQI aqi
  | aqi <= 50   = Good
  | aqi <= 100  = Satisfactory
  | aqi <= 200  = Moderate
  | aqi <= 300  = Poor
  | aqi <= 400  = VeryPoor
  | aqi <= 500  = Severe
  | otherwise   = Unknown

categoryName :: AQICategory -> Text
categoryName Good        = "Good"
categoryName Satisfactory = "Satisfactory"
categoryName Moderate    = "Moderate"
categoryName Poor        = "Poor"
categoryName VeryPoor    = "Very Poor"
categoryName Severe      = "Severe"
categoryName Unknown     = "Unknown"

-- =============================================================================
-- AQI Analysis Functions - Using Map/Filter/Fold
-- =============================================================================

averageAQI :: [Double] -> Double
averageAQI [] = 0
averageAQI xs = sum xs / fromIntegral (length xs)

analyzeRecords :: [AQiRecord] -> CityAnalysis
analyzeRecords [] = CityAnalysis
  { analysisCity = ""
  , analysisAverageAqi = 0
  , analysisMaxAqi = 0
  , analysisMinAqi = 0
  , analysisTrend = "stable"
  , analysisCategoryCounts = []
  , analysisAlert = "No data available"
  , analysisRecommendation = "No data to analyze"
  }
analyzeRecords records =
  let aqiValues  = map recordAqi records
      avg        = averageAQI aqiValues
      maxA       = maximum aqiValues
      minA       = minimum aqiValues
      trend      = calculateTrend aqiValues
      counts     = countCategories records
      alertMsg   = generateAlert avg maxA counts
      recMsg     = generateRecommendation avg counts
  in CityAnalysis
       { analysisCity           = ""
       , analysisAverageAqi     = avg
       , analysisMaxAqi         = maxA
       , analysisMinAqi         = minA
       , analysisTrend          = trend
       , analysisCategoryCounts = counts
       , analysisAlert          = alertMsg
       , analysisRecommendation = recMsg
       }

countCategories :: [AQiRecord] -> [(Text, Int)]
countCategories records = foldr incrementCount [] (map (classifyAQI . recordAqi) records)
  where
    incrementCount :: AQICategory -> [(Text, Int)] -> [(Text, Int)]
    incrementCount cat [] = [(categoryName cat, 1)]
    incrementCount cat ((name, count):rest)
      | name == categoryName cat = (name, count + 1):rest
      | otherwise                = (name, count):incrementCount cat rest

-- =============================================================================
-- Trend Analysis
-- =============================================================================

calculateTrend :: [Double] -> Text
calculateTrend values
  | length values < 2 = "stable"
  | otherwise         =
      let n     = fromIntegral (length values)
          slope = linearSlope (zip [0..(n-1)] values) (n / 2) (averageAQI values)
      in if slope > 2 then "worsening"
         else if slope < -2 then "improving"
         else "stable"

linearSlope :: [(Double, Double)] -> Double -> Double -> Double
linearSlope points xMean yMean =
  let numerator   = sum $ map (\(x, y) -> (x - xMean) * (y - yMean)) points
      denominator = sum $ map (\(x, _) -> (x - xMean) ** 2) points
  in if denominator == 0 then 0 else numerator / denominator

-- =============================================================================
-- Alert Generation
-- =============================================================================

lookupCount :: Text -> [(Text, Int)] -> Int
lookupCount _ [] = 0
lookupCount key ((k, v):rest) = if key == k then v else lookupCount key rest

generateAlert :: Double -> Double -> [(Text, Int)] -> Text
generateAlert avgAqi maxAqi counts
  | maxAqi > 400                           = "Severe air quality emergency! Avoid all outdoor activities."
  | maxAqi > 300 || severeCount >= 3      = "Very poor air quality - Health emergency warning issued."
  | maxAqi > 200 || poorCount >= 5        = "Unhealthy air quality - Sensitive groups should stay indoors."
  | avgAqi > 100                          = "Moderate air quality - Sensitive individuals may experience effects."
  | avgAqi > 50                           = "Satisfactory air quality - Generally acceptable for most."
  | otherwise                              = "Good air quality - No health concerns."
  where
    severeCount = lookupCount "Severe" counts
    poorCount   = lookupCount "Poor" counts

generateRecommendation :: Double -> [(Text, Int)] -> Text
generateRecommendation avgAqi counts
  | avgAqi > 400 = "Stay indoors with air purifiers. Use N95 masks if going out is unavoidable. Avoid physical activity outdoors."
  | avgAqi > 300 = "Avoid outdoor activities. Use air purifiers indoors. Keep windows closed. Consider temporary relocation if possible."
  | avgAqi > 200 = "Reduce prolonged outdoor exposure. Sensitive groups should limit outdoor activities. Wear protective masks outdoors."
  | avgAqi > 100 = "Sensitive individuals should limit prolonged outdoor activities. Others can continue normal activities."
  | avgAqi > 50  = "Generally safe for all. Unusually sensitive people may experience minor symptoms."
  | otherwise    = "No precautions necessary. Air quality is excellent for outdoor activities."

-- =============================================================================
-- City Comparison
-- =============================================================================

compareTwoCities :: Text -> [AQiRecord] -> Text -> [AQiRecord] -> CityComparison
compareTwoCities city1 records1 city2 records2 =
  let analysis1 = analyzeRecords records1
      analysis2 = analyzeRecords records2
      betterCity = if analysisAverageAqi analysis1 < analysisAverageAqi analysis2
                   then city1 else city2
      recMsg = city1 <> " has " <> (if analysisAverageAqi analysis1 < analysisAverageAqi analysis2 then "better" else "worse")
            <> " air quality compared to " <> city2 <> "."
  in CityComparison
       { comparisonCity1          = city1
       , comparisonCity2          = city2
       , comparisonAnalysis1      = analysis1 { analysisCity = city1 }
       , comparisonAnalysis2      = analysis2 { analysisCity = city2 }
       , comparisonBetterCity     = betterCity
       , comparisonRecommendation = recMsg
       }

-- =============================================================================
-- Alert Generation
-- =============================================================================

generateAlerts :: Text -> [AQiRecord] -> AlertInfo
generateAlerts city records =
  let analysis = analyzeRecords records
      maxAqi   = analysisMaxAqi analysis
      avgAqi   = analysisAverageAqi analysis
      counts   = analysisCategoryCounts analysis
      severity = determineSeverity maxAqi counts
      alertMsg = generateAlert avgAqi maxAqi counts
      recMsg   = generateRecommendation avgAqi counts
  in AlertInfo
       { alertCity           = city
       , alertMessage        = alertMsg
       , alertSeverity       = severity
       , alertMaxAqi         = maxAqi
       , alertRecommendation = recMsg
       }

determineSeverity :: Double -> [(Text, Int)] -> Text
determineSeverity maxAqi counts
  | maxAqi > 400                    = "critical"
  | maxAqi > 300                    = "high"
  | maxAqi > 200                    = "moderate"
  | otherwise                       = "low"

-- =============================================================================
-- Request Handlers
-- =============================================================================

data AnalyzeCityInput = AnalyzeCityInput
  { inputCity    :: Text
  , inputRecords :: [AQiRecord]
  } deriving (Show, Eq)

instance FromJSON AnalyzeCityInput where
  parseJSON = withObject "AnalyzeCityInput" $ \v -> AnalyzeCityInput
    <$> v .: "city"
    <*> v .: "records"

data CompareCitiesInput = CompareCitiesInput
  { compareCity1    :: Text
  , compareCity2    :: Text
  , compareRecords1 :: [AQiRecord]
  , compareRecords2 :: [AQiRecord]
  } deriving (Show, Eq)

instance FromJSON CompareCitiesInput where
  parseJSON = withObject "CompareCitiesInput" $ \v -> CompareCitiesInput
    <$> v .: "city1"
    <*> v .: "city2"
    <*> v .: "records1"
    <*> v .: "records2"

data GenerateAlertsInput = GenerateAlertsInput
  { alertsCity    :: Text
  , alertsRecords :: [AQiRecord]
  } deriving (Show, Eq)

instance FromJSON GenerateAlertsInput where
  parseJSON = withObject "GenerateAlertsInput" $ \v -> GenerateAlertsInput
    <$> v .: "city"
    <*> v .: "records"

-- =============================================================================
-- HTTP Request Processing
-- =============================================================================

data Route = AnalyzeCity | CompareCities | GenerateAlerts | NotFound
  deriving (Show, Eq)

parseRoute :: [Text] -> Route
parseRoute ["analyze-city"]   = AnalyzeCity
parseRoute ["compare-cities"] = CompareCities
parseRoute ["generate-alerts"] = GenerateAlerts
parseRoute _                   = NotFound

handleRequest :: Request -> BL.ByteString -> IO BL.ByteString
handleRequest req body =
  case parseRoute (pathInfo req) of
    AnalyzeCity   -> handleAnalyzeCity body
    CompareCities -> handleCompareCities body
    GenerateAlerts -> handleGenerateAlerts body
    NotFound      -> return $ encode $ object ["error" .= ("Not found" :: Text)]

handleAnalyzeCity :: BL.ByteString -> IO BL.ByteString
handleAnalyzeCity body =
  case decode body of
    Nothing -> return $ encode $ object ["error" .= ("Invalid JSON" :: Text)]
    Just input -> do
      let records = inputRecords input
          analysis = if null records
                     then CityAnalysis
                            { analysisCity = inputCity input
                            , analysisAverageAqi = 0
                            , analysisMaxAqi = 0
                            , analysisMinAqi = 0
                            , analysisTrend = "stable"
                            , analysisCategoryCounts = []
                            , analysisAlert = "No data available"
                            , analysisRecommendation = "No data to analyze"
                            }
                     else (analyzeRecords records) { analysisCity = inputCity input }
      return $ encode analysis

handleCompareCities :: BL.ByteString -> IO BL.ByteString
handleCompareCities body =
  case decode body of
    Nothing -> return $ encode $ object ["error" .= ("Invalid JSON" :: Text)]
    Just input -> do
      let comparison = compareTwoCities
                        (compareCity1 input)
                        (compareRecords1 input)
                        (compareCity2 input)
                        (compareRecords2 input)
      return $ encode comparison

handleGenerateAlerts :: BL.ByteString -> IO BL.ByteString
handleGenerateAlerts body =
  case decode body of
    Nothing -> return $ encode $ object ["error" .= ("Invalid JSON" :: Text)]
    Just input -> do
      let alert = generateAlerts (alertsCity input) (alertsRecords input)
      return $ encode alert

-- =============================================================================
-- WAI Application
-- =============================================================================

app :: Application
app req respond = do
  body <- requestBody req
  let lazyBody = BL.fromChunks [body]
  result <- handleRequest req lazyBody
  respond $ responseLBS
    status200
    [("Content-Type", "application/json")]
    result

-- =============================================================================
-- Main Entry Point
-- =============================================================================

main :: IO ()
main = do
  putStrLn "BreathX AQI Analysis Microservice"
  putStrLn "=================================="
  putStrLn "Starting Haskell microservice on port 8080..."
  putStrLn "Endpoints:"
  putStrLn "  POST /analyze-city    - Analyze AQI data for a city"
  putStrLn "  POST /compare-cities  - Compare AQI between two cities"
  putStrLn "  POST /generate-alerts - Generate air quality alerts"
  putStrLn ""
  run 8080 app
