var ge = (function(window, DB){

    if(!window.Peer)    throw "PeerJS is required to use this module";
    if(!window._)       throw "UnderscoreJS is required to use this module";
    if(!DB)             throw "Some DB module is required";

    var module = {};
    module.self = undefined; //The peer for this page
    module.room_name = undefined;
    module.PEERJS_KEY = undefined;
    module.DEBUG = false;

    window.onbeforeunload = function(){
        //clean up
        module.self.disconnect();
        module.self.destroy();
        module.peers.set_peers( module.peers.get_active_peers() ); //save only the old connections, not self
        //window.clearInterval(module.peers.update_interval_id); //stop update 
    };
    
    log = function(msg){
        if(module.DEBUG) console.log(msg);
    }

/* Stupid Simple Event System */
    module.event={};
    module.event.listeners = {};
    
    module.event.publish_event = function(event, d){
        var f = module.event.listeners[event];
        if(f){
            log("calling command handler "+event);
            window.setTimeout(f, 0, d);
        }else{
            throw "unknown command: " + event;
        }
    };
    
    module.event.listen_for = function(e, c){
        module.event.listeners[e] =  c;
    };
/******************************/


/* Peer List Management */
    module.peers = {};
    module.peers.get_active_peers = function(){
        //get a list of actively connected peers
        return window._.chain(module.self.connections)
                .filter(function(e){ return e[0].open; })   //only open coonections
                .map(function(e){ return e[0].peer; })        //get ids
                .value();
    };

    module.peers.get_peers = function(){
        //get a list of peers in the room to connect to, not including you
	    var peers = window._.reject( DB.get(module.room_name), function(e){
	        return e === module.self.id;
        });
        log("grabbed");
        log(peers);
	    if( !window._.isArray(peers) ){
		    //peers = [];
		    module.peers.set_peers(peers);
	    }
	    return peers;
    };
    
    module.peers.set_peers = function(peers){
        //store a peer list
        var list = window._.filter(peers, function(e){
                return !!e;
	    })
        log("setting with ");
        log(list);
	    DB.store(module.room_name, list);
    };

    module.peers.update_peers = function(){
        //get a list of active connections and store them
        var peers = window._.chain( module.peers.get_active_peers() )
            .push( module.self.id )
            .reject( function(e){
                return e==="null";
            })
            .value();
        log("updating with");
        log(peers);
        module.peers.set_peers(peers);
    }
/******************************************/
    

    module.connect = function(key, room_name, callback, debug){
        var cb = (typeof callback == 'function') ? callback : new Function(callback);
        module.DEBUG = debug;
        module.PEERJS_KEY = key;
        module.room_name = room_name;
        var pdata = {
      		key: module.PEERJS_KEY,
      		config: {
      			'iceServers': [
        			{ url: 'stun:stun.l.google.com:19302' },
      			],
		    },
      	};
        if(module.DEBUG) pdata.debug = 3;
      	module.self = new window.Peer(pdata);
      	
      	module.self.on('open', function(id){
      		log("my id is "+id);
      		
      		var peers = module.peers.get_peers();
      		log("testing peers:");
      		log(peers);
	        if( peers === null || peers.length === 0 ) log('This room is empty.');
	        log("friends: "+peers);
	        window._.each(peers, function(e,i,a){
		        log("connecting to "+e);
		        var conn =  module.self.connect(e);
		        conn.on('data', function(req){
			        log('rcd');
			        log(req);
			        if(req.command) module.event.publish_event(req.command, req.data);
		        });
	        })
	        //module.peers.update_peers();
	        //log("now it looks like:");
	        //log( module.peers.get_peers() );
	        //module.peers.update_interval_id =  window.setInterval(module.peers.update_peers, 3000);//TODO ideally dont do this
	        //window.setTimeout(module.peers.update_peers, 5000);
	        
	        module.self.on('connection', function(conn){
		        log('connection recvd');
		        log(conn);
		        module.peers.update_peers();
		        conn.on('data', function(req){
			        log('rcd');
			        log(req);
		            if(req.command) module.event.publish_event(req.command, req.data);
		        });
	        });
	        module.peers.update_peers();
	        window.setTimeout(cb,0,module.self);
      	});
    }
    
    module.send = function(command, data){
        //send out a message to all peers
        log('trying to send a message');
        var message={};
        message.command = command;
        message.data = data;
        log(message);
        window._.each(module.peers.get_active_peers(), function(peer){
            var c = module.self.connections[peer];
            log(c);
            if(c){
                log("sending to "+peer);
                c[0].send(message);
            }
        });
    }
    
    return module;
}(window, DB));
