var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var JigSchema = new Schema({
  jig: Object
});

JigSchema.virtual('date')
  .get(function(){
    return this._id.getTimestamp();
  });

mongoose.model('Jig', JigSchema);