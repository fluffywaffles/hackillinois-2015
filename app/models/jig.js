var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var JigSchema = new Schema({
  url: String,
  rawHTML: String,
  body: String,
  deps: Array,
  liveChange: String
});

JigSchema.virtual('date')
  .get(function(){
    return this._id.getTimestamp();
  });

var Jig = mongoose.model('Jig', JigSchema);
module.exports = Jig;