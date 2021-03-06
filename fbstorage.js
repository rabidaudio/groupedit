var DB = (function(window){

    if(!window.Firebase)    throw "This module requires Firebase.";
    //if(!window._)           throw "UnderscoreJS is required to use this module";
    
    module={};
    module.init = function(room_name){//, update_callback){
        module.room = room_name;
        module.FB = new Firebase('https://blinding-fire-3695.firebaseio.com/room/');
        //module.cb = (typeof update_callback == 'function') ? update_callback : new Function(update_callback);
        
        //set a listener
        module.FB.child(module.room).on('value', function(dataSnapshot){
            console.log('Data changed on FB');
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
    return module;
}(window));
