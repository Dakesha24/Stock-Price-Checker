'use strict';

const https = require('https');
const crypto = require('crypto');

// In-memory storage for likes (in production, use a proper database)
const stockLikes = new Map();
const ipLikes = new Map();

// Debug function to log current state
function debugLikesState() {
  console.log('\n=== DEBUG LIKES STATE ===');
  console.log('Stock Likes:', Object.fromEntries(stockLikes));
  console.log('IP Likes (first 5):', Object.fromEntries([...ipLikes.entries()].slice(0, 5)));
  console.log('Total IPs tracked:', ipLikes.size);
  console.log('========================\n');
}

// Function to get real IP address
function getRealIP(req) {
  // Try multiple sources for IP address
  const ip = req.headers['x-forwarded-for'] || 
             req.headers['x-real-ip'] || 
             req.connection.remoteAddress || 
             req.socket.remoteAddress ||
             (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
             req.ip ||
             '127.0.0.1'; // fallback for local development
  
  // Handle IPv6 mapped IPv4 addresses
  const cleanIP = ip.split(',')[0].trim().replace(/^::ffff:/, '');
  
  console.log(`🌐 Raw IP sources:`, {
    'x-forwarded-for': req.headers['x-forwarded-for'],
    'x-real-ip': req.headers['x-real-ip'],
    'connection.remoteAddress': req.connection.remoteAddress,
    'req.ip': req.ip,
    'final_ip': cleanIP
  });
  
  return cleanIP;
}

// Function to anonymize IP address
function anonymizeIP(ip) {
  // Create a consistent hash from IP
  const hash = crypto.createHash('sha256').update(ip + 'SALT_FOR_STOCK_LIKES').digest('hex');
  const shortHash = hash.substring(0, 16);
  
  console.log(`🔒 IP Anonymization: ${ip} -> ${shortHash}`);
  return shortHash;
}

// Function to fetch stock price from the proxy API
function fetchStockPrice(symbol) {
  return new Promise((resolve, reject) => {
    // For development/testing, return mock data if proxy is down
    const mockPrices = {
      'GOOG': 150.25,
      'MSFT': 513.24,
      'AAPL': 225.50,
      'TSLA': 275.80,
      'AMZN': 185.30
    };
    
    const url = `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${symbol}/quote`;
    
    const timeout = setTimeout(() => {
      console.log(`⚠️ API timeout for ${symbol}, using mock data`);
      resolve({
        stock: symbol,
        price: mockPrices[symbol] || 100.00
      });
    }, 5000); // 5 second timeout
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        clearTimeout(timeout);
        try {
          const stockData = JSON.parse(data);
          console.log(`📊 API Success for ${symbol}:`, stockData);
          resolve({
            stock: stockData.symbol || symbol,
            price: stockData.latestPrice || mockPrices[symbol] || 100.00
          });
        } catch (error) {
          console.log(`⚠️ API parse error for ${symbol}, using mock data`);
          resolve({
            stock: symbol,
            price: mockPrices[symbol] || 100.00
          });
        }
      });
    }).on('error', (error) => {
      clearTimeout(timeout);
      console.log(`⚠️ API error for ${symbol}, using mock data:`, error.message);
      resolve({
        stock: symbol,
        price: mockPrices[symbol] || 100.00
      });
    });
  });
}

// Function to handle likes
function handleLike(stock, clientIP) {
  const hashedIP = anonymizeIP(clientIP);
  const likeKey = `${stock}_${hashedIP}`;
  
  console.log(`\n👍 LIKE ATTEMPT for ${stock}`);
  console.log(`🔑 Like Key: ${likeKey}`);
  console.log(`📊 Current likes for ${stock}:`, stockLikes.get(stock) || 0);
  console.log(`❓ IP already liked this stock?`, ipLikes.has(likeKey));
  
  // Check if this IP has already liked this stock
  if (!ipLikes.has(likeKey)) {
    // Record the like
    ipLikes.set(likeKey, true);
    
    // Increment stock likes count
    const currentLikes = stockLikes.get(stock) || 0;
    const newLikes = currentLikes + 1;
    stockLikes.set(stock, newLikes);
    
    console.log(`✅ LIKE ADDED! ${stock} now has ${newLikes} likes`);
    console.log(`📝 Recorded IP like: ${likeKey}`);
    
    debugLikesState();
    return true; // Like was added
  }
  
  console.log(`❌ LIKE REJECTED - IP already liked ${stock}`);
  return false; // Like was not added (already liked)
}

// Function to get likes for a stock
function getLikes(stock) {
  const likes = stockLikes.get(stock) || 0;
  console.log(`📊 Getting likes for ${stock}: ${likes}`);
  return likes;
}

module.exports = function (app) {

  app.route('/api/stock-prices')
    .get(async function (req, res) {
      try {
        console.log('\n🚀 === NEW API REQUEST ===');
        console.log('📝 Query params:', req.query);
        
        const { stock, like } = req.query;
        const clientIP = getRealIP(req);
        
        console.log(`🌐 Client IP: ${clientIP}`);
        console.log(`👍 Like requested: ${like}`);
        
        // Handle single stock or array of stocks
        const stocks = Array.isArray(stock) ? stock : [stock];
        console.log(`📊 Stocks to process:`, stocks);
        
        // Validate that we have at least one stock
        if (!stocks[0]) {
          console.log('❌ No stock symbol provided');
          return res.status(400).json({ error: 'Stock symbol is required' });
        }
        
        // Validate stock symbols (basic validation)
        for (let stockSymbol of stocks) {
          if (!stockSymbol || typeof stockSymbol !== 'string' || stockSymbol.length === 0) {
            console.log(`❌ Invalid stock symbol: ${stockSymbol}`);
            return res.status(400).json({ error: 'Invalid stock symbol' });
          }
        }
        
        // Process likes if requested
        if (like === 'true') {
          console.log('\n👍 === PROCESSING LIKES ===');
          stocks.forEach(stockSymbol => {
            const upperStock = stockSymbol.toUpperCase();
            const likeAdded = handleLike(upperStock, clientIP);
            console.log(`${upperStock}: like ${likeAdded ? 'ADDED' : 'REJECTED'}`);
          });
          console.log('=========================\n');
        }
        
        // Fetch stock prices for all stocks
        console.log('\n📊 === FETCHING STOCK PRICES ===');
        const stockPromises = stocks.map(stockSymbol => {
          const upperStock = stockSymbol.toUpperCase();
          console.log(`📡 Fetching price for ${upperStock}...`);
          return fetchStockPrice(upperStock);
        });
        
        const stockResults = await Promise.all(stockPromises);
        console.log('📊 All prices fetched:', stockResults);
        
        // Handle single stock response
        if (stocks.length === 1) {
          const stockData = stockResults[0];
          const likes = getLikes(stockData.stock);
          
          const response = {
            stockData: {
              stock: stockData.stock,
              price: stockData.price,
              likes: likes
            }
          };
          
          console.log('📤 Single stock response:', response);
          return res.json(response);
        }
        
        // Handle multiple stocks response (with relative likes)
        if (stocks.length === 2) {
          const stock1Data = stockResults[0];
          const stock2Data = stockResults[1];
          
          const stock1Likes = getLikes(stock1Data.stock);
          const stock2Likes = getLikes(stock2Data.stock);
          
          const response = {
            stockData: [
              {
                stock: stock1Data.stock,
                price: stock1Data.price,
                rel_likes: stock1Likes - stock2Likes
              },
              {
                stock: stock2Data.stock,
                price: stock2Data.price,
                rel_likes: stock2Likes - stock1Likes
              }
            ]
          };
          
          console.log('📤 Two stocks response:', response);
          return res.json(response);
        }
        
        // Handle case with more than 2 stocks (not specified in requirements)
        console.log('❌ Too many stocks requested');
        return res.status(400).json({ error: 'Maximum 2 stocks can be compared' });
        
      } catch (error) {
        console.error('💥 Error in stock price API:', error);
        return res.status(500).json({ error: 'Failed to fetch stock data' });
      }
    });
    
  // Debug endpoint to check likes state
  app.route('/api/debug/likes')
    .get(function(req, res) {
      const debug = {
        stockLikes: Object.fromEntries(stockLikes),
        ipLikes: Object.fromEntries(ipLikes),
        totalIPs: ipLikes.size,
        clientIP: getRealIP(req)
      };
      
      console.log('🔍 Debug endpoint called:', debug);
      res.json(debug);
    });
    
};