var DB = (function(){
    //Module for handling storage. using localStorage for
    //testing. to be replaced with Firebase.
    module={};
    
    module.store = function(id, data){
        localStorage.setItem(id, JSON.stringify(data));
    }
    
    module.get = function(id){
        return JSON.parse(localStorage.getItem(id));
    }
    return module;
}());
