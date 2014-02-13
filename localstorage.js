var DB = (function(){
    //Module for handling storage. using localStorage for
    //testing. to be replaced with Firebase.
    module={};
    module.init(room_name){
        module.room = room_name;
        //create accessor functions
        module.store = function(data){
            localStorage.setItem(module.room, JSON.stringify(data));
        }
        
        module.get = function(){
            return JSON.parse(localStorage.getItem(module.room));
        }
    }
    return module;
}());
