'use strict';

const mongoose = require('mongoose');
const fetch = require('node-fetch');
const crypto = require('crypto');

// MongoDB Schema for storing likes
const StockLike = mongoose.model('StockLike', new mongoose.Schema({
  stock: { type: String, required: true },
  ip: { type: String, required: true }, // This will store hashed IP
  likes: { type: Number, default: 1 }
}));

// Function to anonymize IP address by hashing
function hashIP(ip) {
  return crypto.createHash('sha256').update(ip).digest('hex');
}

// Function to get stock data from proxy API  
async function getStockData(symbol) {
  try {
    const response = await fetch(`https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${symbol}/quote`);
    const data = await response.json();
    return {
      stock: symbol.toUpperCase(),
      price: data.latestPrice
    };
  } catch (error) {
    throw new Error('Invalid stock symbol');
  }
}

// Function to get or update likes for a stock
async function handleLikes(stock, ip, shouldLike) {
  const hashedIP = hashIP(ip);
  
  if (shouldLike) {
    // Check if this IP already liked this stock
    const existingLike = await StockLike.findOne({ 
      stock: stock.toUpperCase(), 
      ip: hashedIP 
    });
    
    if (!existingLike) {
      // Create new like record
      await StockLike.create({
        stock: stock.toUpperCase(),
        ip: hashedIP
      });
    }
  }
  
  // Count total likes for this stock
  const likesCount = await StockLike.countDocuments({ 
    stock: stock.toUpperCase() 
  });
  
  return likesCount;
}

module.exports = function (app) {
  app.route('/api/stock-prices')
    .get(async function (req, res) {
      try {
        const { stock, like } = req.query;
        const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
        const shouldLike = like === 'true';
        
        // Handle single stock
        if (typeof stock === 'string') {
          const stockData = await getStockData(stock);
          const likes = await handleLikes(stock, clientIP, shouldLike);
          
          stockData.likes = likes;
          
          return res.json({ stockData });
        }
        
        // Handle multiple stocks (comparison)
        if (Array.isArray(stock) && stock.length === 2) {
          const [stock1, stock2] = stock;
          
          // Get stock data for both
          const [stockData1, stockData2] = await Promise.all([
            getStockData(stock1),
            getStockData(stock2)
          ]);
          
          // Handle likes for both stocks if requested
          const [likes1, likes2] = await Promise.all([
            handleLikes(stock1, clientIP, shouldLike),
            handleLikes(stock2, clientIP, shouldLike)
          ]);
          
          // Calculate relative likes
          stockData1.rel_likes = likes1 - likes2;
          stockData2.rel_likes = likes2 - likes1;
          
          return res.json({ 
            stockData: [stockData1, stockData2] 
          });
        }
        
        // Invalid request
        res.status(400).json({ error: 'Invalid stock parameter' });
        
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    });
};