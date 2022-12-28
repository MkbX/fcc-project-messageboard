'use strict';

module.exports = function (app) {

  const mongoose = require('mongoose');
  mongoose.connect(process.env.DB, { useNewUrlParser: true, useUnifiedTopology: true });
  const db = mongoose.connection;
  db.on("connected", ()=> console.log('Connected to database!'));
  db.on("error", (error)=> console.log('Error: ', error));

  const replySchema = new mongoose.Schema({
    text: String,
    delete_password: String,
    reported: Boolean,
    created_on: Date,
  });
  const replyCollection = new mongoose.model('Reply', replySchema);

  const threadSchema = new mongoose.Schema({
    board: String,
    text: String,
    delete_password: String,
    reported: Boolean,
    created_on: Date,
    bumped_on: Date,
    replies: [replySchema] ,   
  });

  const threadCollection = new mongoose.model('Thread', threadSchema);
  
  app.route('/api/threads/:board')
  .get((req, res) => {
    let threadArray = [];
    threadCollection.find({board: req.params.board}, '-reported -delete_password').then(found => {
      threadArray = found;
      threadArray.sort((a,b)=>b.bumped_on - a.bumped_on);
      if(threadArray.length > 10) {
        threadArray.splice(0,10);
      }
      threadArray = threadArray.map(e => {
        e.replies.sort((a,b)=>b.created_on - a.created_on);
        if(e.replies.length > 3) {
          e.replies.splice(0,3);
        }
        return e;
      });
      threadArray = threadArray.map(e => {
        e.replies = e.replies.map(elem => {
        return {_id: elem._id, text: elem.text, created_on: elem.created_on};
        });
        return e;
      });
      //console.log('f: ', threadArray);
      res.json(threadArray);
    }).catch(err => {
      console.log(err);
      res.json(err);
    });
  })
  .post((req, res) => {
    let postedThread = new threadCollection({
      board: req.params.board,
      text: req.body.text,
      delete_password: req.body.delete_password,
      reported: false,
      replies: [],
      created_on: new Date(),
      bumped_on: new Date(),
    });
    postedThread.save().then(savedThread => {
      console.log('thread created: ', savedThread);
      res.json(savedThread);
    }).catch(err => {
      console.log(err);
      res.json({db_error_thread: err});
    });
  })
  .put((req, res) => {
    threadCollection.findById({_id: req.body.thread_id})
    .then(found => {
      if(!found) {
        res.json({thread_id: 'Not found.'});
      }
      else {
        threadCollection.findOneAndUpdate({"_id": req.body.thread_id}, {$set: {reported: true}}, {new: true}).then(doc=>console.log(doc)).catch(err=>console.log(err));
        res.send("reported");
      }

    })
    .catch(err=> {
      console.log(err);
      res.json({db_error_finding_thread: err});
    });
  })
  .delete((req, res) => {
    threadCollection.findById({_id: req.body.thread_id})
    .then(foundDoc => {
      if (!foundDoc) {
        res.json({thread_id: 'Not found.'});
      }
      else {
        if(req.body.delete_password != foundDoc.delete_password) {
          res.send("incorrect password");
        } else {
          threadCollection.findByIdAndRemove(req.body.thread_id).then(doc=>console.log(doc)).catch(err=>console.log(err));
          res.send("success");

        }
      }
      
    })
    .catch(err => {
      console.log(err);
      res.json({db_error_finding_thread: err});
    });
  });
    
  app.route('/api/replies/:board')
  .get((req, res) => {
    threadCollection.findById({_id: req.query.thread_id}, '-reported -delete_password')
    .then(foundDoc => {
      foundDoc.replies = foundDoc.replies.map(elem => {
        return {_id: elem._id, text: elem.text, created_on: elem.created_on};
        });
      res.json(foundDoc);
    })
    .catch(err => {
      console.log(err);
      res.json({db_error_finding_thread: err});
    });

  })
  .post((req, res) => {
    let postedReply = new replyCollection({
      text: req.body.text,
      delete_password: req.body.delete_password,
      reported: false,
      created_on: new Date(),
    }); 
    postedReply.save().then(postedReply => {
      console.log('reply created: ', postedReply);
      //res.json({savedReply});
      threadCollection.findById({_id: req.body.thread_id}).then(foundThread => {
        if(!foundThread) {
          res.json({thread_id: 'Not found.'});
        }
        else {
          foundThread.replies.push(postedReply);
          foundThread.bumped_on = postedReply.created_on;
          foundThread.save().then(foundThread => {console.log('foundThread: ', foundThread);res.json(postedReply);})
          .catch(err=> {console.log(err); res.json({db_error_saving_thread: err});});          
          
        }
      }).catch(err => { 
        console.log(err); res.json({db_error_finding_thread: err})});
    }).catch(err => {
      console.log(err);
      res.json({db_error_reply: err});
    });
    
  })
  .put((req, res) => {
    threadCollection.findById({_id: req.body.thread_id})
    .then(found => {
      if(!found) {
        res.json({thread_id: 'Not found.'});
      }
      else {
        replyCollection.findById({_id: req.body.reply_id})
        .then(reply => {
          if(!reply) {
            res.json({reply_id: 'Not found.'});
          } else {
            threadCollection.findOneAndUpdate({"_id": req.body.thread_id, "replies._id": req.body.reply_id}, {"replies.$.reported": true}).then(doc=>console.log(doc)).catch(err=>console.log(err));
            res.send("reported");
          }
        })
        .catch(err=> {
          console.log(err);
          res.json({db_error_finding_reply: err});
        });
      }

    })
    .catch(err=> {
      console.log(err);
      res.json({db_error_finding_thread: err});
    });
  })
  .delete((req, res) => {
    threadCollection.findById({_id: req.body.thread_id})
    .then(foundDoc => {
      if (!foundDoc) {
        res.json({thread_id: 'Not found.'});
      }
      else {
        replyCollection.findById({_id: req.body.reply_id})
        .then(foundReply =>{
          if(!foundReply) {
            res.json({reply_id: 'Not found.'})
          }
          else {
            if(req.body.delete_password != foundReply.delete_password) {
              res.send("incorrect password");
            } else {
              //foundDoc.replies.text = '[deleted]';
              threadCollection.findOneAndUpdate({"_id": req.body.thread_id, "replies._id": req.body.reply_id}, {"replies.$.text": '[deleted]'}/*{$set: {text: '[deleted]'}}, {new: true}*/).then(doc=>console.log(doc)).catch(err=>console.log(err));
              res.send("success");
    
            }
          }
        })
        .catch(err=>{
          console.log(err);
          res.json({db_error_finding_reply: err});
        })

        
      }
      
    })
    .catch(err => {
      console.log(err);
      res.json({db_error_finding_thread: err});
    });
  });

};
