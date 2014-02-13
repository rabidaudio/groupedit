var DB = (function(window){
    //Module for handling storage. using localStorage for
    //testing. to be replaced with Firebase.
    if(!window.Firebase)    throw "This module requires Firebase.";
    if(!window._)           throw "UnderscoreJS is required to use this module"; //TODO remove this if possible
    
    module={};
    module.init = function(room_name){//, update_callback){
        module.room = room_name;
        module.FB = new Firebase('https://blinding-fire-3695.firebaseio.com/room/');
        //module.cb = (typeof update_callback == 'function') ? update_callback : new Function(update_callback);
        
        //set a listener
        module.FB.child(module.room).on('value', function(dataSnapshot){
            console.log('Data changed on FB');
            //module.data = window._.flatten(dataSnapshot.val());
            module.data = dataSnapshot.val();
            console.log(module.data);
            //setTimeout(module.cb, 0, module.data);
        });
        
        module.store = function(data){
            var fbpush = module.FB.child(module.room).set(data);
        }
        module.get = function(){
            return module.data;
        }
    }
        
    //create accessor functions
    //module.store = function(id, data){
        //localStorage.setItem(id, JSON.stringify(data));
    //}
    
    //module.get = function(id){
    //    return JSON.parse(localStorage.getItem(id));
    //}
    return module;
}(window));
