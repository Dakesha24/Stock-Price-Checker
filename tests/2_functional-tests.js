const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function() {
  
  this.timeout(15000);

  test('Viewing one stock: GET request to /api/stock-prices/', function(done) {
    chai.request(server)
      .get('/api/stock-prices')
      .query({stock: 'GOOG'})
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.isObject(res.body);
        assert.property(res.body, 'stockData');
        assert.isObject(res.body.stockData);
        assert.property(res.body.stockData, 'stock');
        assert.property(res.body.stockData, 'price');
        assert.property(res.body.stockData, 'likes');
        assert.equal(res.body.stockData.stock, 'GOOG');
        assert.isNumber(res.body.stockData.price);
        assert.isNumber(res.body.stockData.likes);
        done();
      });
  });

  test('Viewing one stock and liking it: GET request to /api/stock-prices/', function(done) {
    chai.request(server)
      .get('/api/stock-prices')
      .query({stock: 'GOOG', like: 'true'})
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.isObject(res.body);
        assert.property(res.body, 'stockData');
        assert.isObject(res.body.stockData);
        assert.property(res.body.stockData, 'stock');
        assert.property(res.body.stockData, 'price');
        assert.property(res.body.stockData, 'likes');
        assert.equal(res.body.stockData.stock, 'GOOG');
        assert.isNumber(res.body.stockData.price);
        assert.isNumber(res.body.stockData.likes);
        assert.isAtLeast(res.body.stockData.likes, 1);
        done();
      });
  });

  test('Viewing the same stock and liking it again: GET request to /api/stock-prices/', function(done) {
    chai.request(server)
      .get('/api/stock-prices')
      .query({stock: 'GOOG'})
      .end(function(err, res) {
        const initialLikes = res.body.stockData.likes;
        
        chai.request(server)
          .get('/api/stock-prices')
          .query({stock: 'GOOG', like: 'true'})
          .end(function(err, res) {
            assert.equal(res.status, 200);
            assert.isObject(res.body);
            assert.property(res.body, 'stockData');
            assert.isObject(res.body.stockData);
            assert.property(res.body.stockData, 'stock');
            assert.property(res.body.stockData, 'price');
            assert.property(res.body.stockData, 'likes');
            assert.equal(res.body.stockData.stock, 'GOOG');
            assert.isNumber(res.body.stockData.price);
            assert.isNumber(res.body.stockData.likes);
            // Likes should not increase from same IP
            assert.equal(res.body.stockData.likes, initialLikes);
            done();
          });
      });
  });

  test('Viewing two stocks: GET request to /api/stock-prices/', function(done) {
    chai.request(server)
      .get('/api/stock-prices')
      .query({stock: ['GOOG', 'MSFT']})
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.isObject(res.body);
        assert.property(res.body, 'stockData');
        assert.isArray(res.body.stockData);
        assert.equal(res.body.stockData.length, 2);
        
        res.body.stockData.forEach(function(stock) {
          assert.property(stock, 'stock');
          assert.property(stock, 'price');
          assert.property(stock, 'rel_likes');
          assert.isString(stock.stock);
          assert.isNumber(stock.price);
          assert.isNumber(stock.rel_likes);
        });
        
        // Check that we have both stocks
        const stocks = res.body.stockData.map(s => s.stock);
        assert.include(stocks, 'GOOG');
        assert.include(stocks, 'MSFT');
        
        // rel_likes should sum to 0
        const totalRelLikes = res.body.stockData[0].rel_likes + res.body.stockData[1].rel_likes;
        assert.equal(totalRelLikes, 0);
        done();
      });
  });

  test('Viewing two stocks and liking them: GET request to /api/stock-prices/', function(done) {
    chai.request(server)
      .get('/api/stock-prices')
      .query({stock: ['GOOG', 'MSFT'], like: 'true'})
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.isObject(res.body);
        assert.property(res.body, 'stockData');
        assert.isArray(res.body.stockData);
        assert.equal(res.body.stockData.length, 2);
        
        res.body.stockData.forEach(function(stock) {
          assert.property(stock, 'stock');
          assert.property(stock, 'price');
          assert.property(stock, 'rel_likes');
          assert.isString(stock.stock);
          assert.isNumber(stock.price);
          assert.isNumber(stock.rel_likes);
        });
        
        // Check that we have both stocks
        const stocks = res.body.stockData.map(s => s.stock);
        assert.include(stocks, 'GOOG');
        assert.include(stocks, 'MSFT');
        
        // rel_likes should sum to 0 (both liked equally from same IP)
        const totalRelLikes = res.body.stockData[0].rel_likes + res.body.stockData[1].rel_likes;
        assert.equal(totalRelLikes, 0);
        done();
      });
  });

});