const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function() {
  
  // Test data
  const testStock1 = 'GOOG';
  const testStock2 = 'MSFT';
  let initialLikes1 = 0;
  let initialLikes2 = 0;

  // Test 1: Viewing one stock
  test('Viewing one stock: GET request to /api/stock-prices/', function(done) {
    chai.request(server)
      .get('/api/stock-prices')
      .query({ stock: testStock1 })
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.isObject(res.body);
        assert.property(res.body, 'stockData');
        assert.isObject(res.body.stockData);
        assert.property(res.body.stockData, 'stock');
        assert.property(res.body.stockData, 'price');
        assert.property(res.body.stockData, 'likes');
        assert.equal(res.body.stockData.stock, testStock1);
        assert.isNumber(res.body.stockData.price);
        assert.isNumber(res.body.stockData.likes);
        
        // Store initial likes for later tests
        initialLikes1 = res.body.stockData.likes;
        done();
      });
  });

  // Test 2: Viewing one stock and liking it
  test('Viewing one stock and liking it: GET request to /api/stock-prices/', function(done) {
    chai.request(server)
      .get('/api/stock-prices')
      .query({ stock: testStock1, like: 'true' })
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.isObject(res.body);
        assert.property(res.body, 'stockData');
        assert.isObject(res.body.stockData);
        assert.property(res.body.stockData, 'stock');
        assert.property(res.body.stockData, 'price');
        assert.property(res.body.stockData, 'likes');
        assert.equal(res.body.stockData.stock, testStock1);
        assert.isNumber(res.body.stockData.price);
        assert.isNumber(res.body.stockData.likes);
        
        // Likes should have increased by 1
        assert.equal(res.body.stockData.likes, initialLikes1 + 1);
        done();
      });
  });

  // Test 3: Viewing the same stock and liking it again (should not increase likes)
  test('Viewing the same stock and liking it again: GET request to /api/stock-prices/', function(done) {
    chai.request(server)
      .get('/api/stock-prices')
      .query({ stock: testStock1, like: 'true' })
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.isObject(res.body);
        assert.property(res.body, 'stockData');
        assert.isObject(res.body.stockData);
        assert.property(res.body.stockData, 'stock');
        assert.property(res.body.stockData, 'price');
        assert.property(res.body.stockData, 'likes');
        assert.equal(res.body.stockData.stock, testStock1);
        assert.isNumber(res.body.stockData.price);
        assert.isNumber(res.body.stockData.likes);
        
        // Likes should remain the same (no increase)
        assert.equal(res.body.stockData.likes, initialLikes1 + 1);
        done();
      });
  });

  // Test 4: Viewing two stocks
  test('Viewing two stocks: GET request to /api/stock-prices/', function(done) {
    chai.request(server)
      .get('/api/stock-prices')
      .query({ stock: [testStock1, testStock2] })
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.isObject(res.body);
        assert.property(res.body, 'stockData');
        assert.isArray(res.body.stockData);
        assert.lengthOf(res.body.stockData, 2);
        
        // Check first stock
        assert.property(res.body.stockData[0], 'stock');
        assert.property(res.body.stockData[0], 'price');
        assert.property(res.body.stockData[0], 'rel_likes');
        assert.isString(res.body.stockData[0].stock);
        assert.isNumber(res.body.stockData[0].price);
        assert.isNumber(res.body.stockData[0].rel_likes);
        
        // Check second stock
        assert.property(res.body.stockData[1], 'stock');
        assert.property(res.body.stockData[1], 'price');
        assert.property(res.body.stockData[1], 'rel_likes');
        assert.isString(res.body.stockData[1].stock);
        assert.isNumber(res.body.stockData[1].price);
        assert.isNumber(res.body.stockData[1].rel_likes);
        
        // rel_likes should sum to 0
        assert.equal(
          res.body.stockData[0].rel_likes + res.body.stockData[1].rel_likes, 
          0
        );
        
        // Store initial relative likes for later test
        initialLikes2 = res.body.stockData[1].rel_likes;
        done();
      });
  });

  // Test 5: Viewing two stocks and liking them
  test('Viewing two stocks and liking them: GET request to /api/stock-prices/', function(done) {
    chai.request(server)
      .get('/api/stock-prices')
      .query({ stock: [testStock1, testStock2], like: 'true' })
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.isObject(res.body);
        assert.property(res.body, 'stockData');
        assert.isArray(res.body.stockData);
        assert.lengthOf(res.body.stockData, 2);
        
        // Check first stock
        assert.property(res.body.stockData[0], 'stock');
        assert.property(res.body.stockData[0], 'price');
        assert.property(res.body.stockData[0], 'rel_likes');
        assert.isString(res.body.stockData[0].stock);
        assert.isNumber(res.body.stockData[0].price);
        assert.isNumber(res.body.stockData[0].rel_likes);
        
        // Check second stock
        assert.property(res.body.stockData[1], 'stock');
        assert.property(res.body.stockData[1], 'price');
        assert.property(res.body.stockData[1], 'rel_likes');
        assert.isString(res.body.stockData[1].stock);
        assert.isNumber(res.body.stockData[1].price);
        assert.isNumber(res.body.stockData[1].rel_likes);
        
        // rel_likes should still sum to 0 (both stocks liked equally)
        assert.equal(
          res.body.stockData[0].rel_likes + res.body.stockData[1].rel_likes, 
          0
        );
        
        done();
      });
  });

  // Additional test: Error handling for invalid stock symbol
  test('Error handling for missing stock symbol', function(done) {
    chai.request(server)
      .get('/api/stock-prices')
      .query({})
      .end(function(err, res) {
        assert.equal(res.status, 400);
        assert.isObject(res.body);
        assert.property(res.body, 'error');
        done();
      });
  });

  // Additional test: Error handling for too many stocks
  test('Error handling for more than 2 stocks', function(done) {
    chai.request(server)
      .get('/api/stock-prices')
      .query({ stock: ['GOOG', 'MSFT', 'AAPL'] })
      .end(function(err, res) {
        assert.equal(res.status, 400);
        assert.isObject(res.body);
        assert.property(res.body, 'error');
        done();
      });
  });

});