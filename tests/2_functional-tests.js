const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);
let global_thread_id;
//let global_reply_id;
let global_pass = 'dl';
let global_board = 'test';
let global_text = 'txt';
//let global_reported = true;

suite('Functional Tests', function() {

    test('Creating a new thread.',  function(done){
        chai.request(server).post('/api/threads/test')
        .send({board: global_board, text: global_text, delete_password: global_pass})
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.property(res.body, '_id');
          assert.typeOf(res.body.replies, 'Array');
          done();
        });
      });

      test('Viewing the 10 most recent threads with 3 replies each.',  function(done){
        chai.request(server).get('/api/threads/test')
        .end(function (err, res) {
          global_thread_id = res.body[0]._id;
          assert.equal(res.status, 200);
          assert.property(res.body[0], 'board');
          assert.typeOf(res.body[0].created_on, 'String');
          done();
        });
      });

      test('Creating a new reply.',  function(done){
        chai.request(server).post('/api/replies/test')
        .send({board: global_board, thread_id: global_thread_id, text: global_text, delete_password: global_pass})
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.property(res.body, '_id');
          assert.typeOf(res.body._id, 'String');
          assert.exists(res.body.created_on);
          done();
        });
      });

      test('Deleting a thread with the incorrect password',  function(done){
        chai.request(server).delete('/api/threads/test')
        .send({"thread_id": "12d632306a98c21edd42bc23", "delete_password": "50js"})
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.exists(res.body);
          done();
        });
      });

      test('Deleting a thread with the correct password',  function(done){
        chai.request(server).delete('/api/threads/test')
        .send({board: global_board, thread_id: global_thread_id, delete_password: global_pass})
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.exists(res.body);
          done();
        });
      });

      test('Deleting a reply with the incorrect password',  function(done){
        chai.request(server).delete('/api/replies/test')
        .send({"thread_id": "12d632306a98c21edd42bc23", "delete_password": "50js"})
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.exists(res.body);
          done();
        });
      });

      test('Deleting a reply with the correct password',  function(done){
        chai.request(server).delete('/api/replies/test')
        .send({"thread_id": "12d632306a98c21edd42bc23", "delete_password": global_pass})
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.exists(res.body);
          done();
        });
      });

      test('Reporting a thread',  function(done){
        chai.request(server).put('/api/threads/test')
        .send({"thread_id": "12d632306a98c21edd42bc23", "reported": true})
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.exists(res.body);
          done();
        });
      });

      test('Reporting a reply',  function(done){
        chai.request(server).put('/api/replies/test')
        .send({"thread_id": "12d632306a98c21edd42bc23", "reported": true})
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.exists(res.body);
          done();
        });
      });

      test('Viewing a single thread with all replies',  function(done){
        chai.request(server).get('/api/threads/test')
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.exists(res.body);
          done();
        });
      });

});
