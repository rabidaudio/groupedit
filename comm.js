var ge = (function(window, DB){

    if(!window.Peer)    throw "PeerJS is required to use this module";
    if(!window._)       throw "UnderscoreJS is required to use this module";
    if(!DB)             throw "Some DB module is required";

    var module = {};
    module.self = undefined; //The peer for this page
    module.room_name = undefined;
    module.PEERJS_KEY = undefined;
    module.DEBUG = false;
    module.delegate = undefined;

    window.onbeforeunload = function(){
        //clean up
        if( module.is_delegate() ){ //TODO for some reason, this gets called, but
            module.pick_new_delegate(); //messages don't actually send
        }
//        module.self.disconnect();
//        module.self.destroy();
    };
    
    log = function(msg){
        if(module.DEBUG) console.log(msg);
    };

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
//TODO needs overhaul for new protocol
    module.peers = {};
    module.peers.get_active_peers = function(){
        //get a list of actively connected peers
        return window._.chain(module.self.connections)
                .filter(function(e){ return e[0].open; })   //only open connections
                .map(function(e){ return e[0].peer; })        //get ids
                .value();
    };

//    module.peers.get_peers = function(){
//        //get a list of peers in the room to connect to, not including you
//	    var peers = window._.reject( DB.get(), function(e){
//	        return e === module.self.id; //TODO rejecting and adding back later is stupid. plz standardize
//        });
//        log("grabbed");
//        log(peers);
//	    if( !window._.isArray(peers) ){
//		    //peers = [];
//		    module.peers.set_peers(peers);
//	    }
//	    return peers;
//    };
    
//    module.peers.set_peers = function(peers){
//        //store a peer list
//        var list = window._.filter(peers, function(e){
//                return !!e;
//	    })
//        log("setting with ");
//        log(list);
//	    //DB.store(module.room_name, list);
//	    DB.store(list);
//    };

//    module.peers.update_peers = function(){
//        //get a list of active connections and store them
//        var peers = window._.chain( module.peers.get_active_peers() )
//            .push( module.self.id )
//            .reject( function(e){
//                return e==="null";
//            })
//            .value();
//        log("updating with");
//        log(peers);
//        module.peers.set_peers(peers);
//    };
/******************************************/

    
/*             Delegate Methods           */

//The delegate is the leader of the room. It is her job
//to list herself in the database, respond to peer requests,  //TODO make submodule
//and choose a new delegate before leaving.
    module.become_delegate = function(){
        //Tell everyone that you are the new delegate
        module.send('delegate_transfer', module.self.id);
        module.set_delegate(module.self.id);
    };
    module.set_delegate = function(id){
        //when delegate is changed, make note if it
        log('setting new delegate');
        module.delegate = id;
        if( module.is_delegate() ){
            DB.store(module.self.id);
            //register peer_request_response event as duty calls
            module.event.listen_for('peer_request', module.handle_peer_request);
        }else{
            module.self.connections[module.delegate][0].on('close', function(){ //module.pick_new_delegate);
                log('connection to delegate lost');
                module.lost_delegate();
            });
        }
    };
    module.is_delegate = function(){
        return (module.delegate === module.self.id);
    };
    module.handle_peer_request = function(caller){
    //peer requests require the data to be the source id.
    //the response is an array of known ids (which may include source and dest)
        var known_peers = window._.chain( module.peers.get_active_peers() )
                .push( module.self.id )
                .reject( function(e){
                    return e==="null";
                })
                .value();
        module.send('peer_request_response', known_peers, caller);
    };
    module.pick_new_delegate = function(){
        log("picking new delegate");
        if( module.is_delegate() ){
            var potential_delegates = window._.chain( module.peers.get_active_peers() )
                .reject( function(e){
                    return e==="null";
                })
                .sort()     //the new delegate is the one with the alphabetically highest id
                .value();
            if( potential_delegates.length > 0){
                module.send('delegate_transfer', potential_delegates[0]);
                module.set_delegate(potential_delegates[0]);
            }else{
                log("I'm the only one here");
                DB.store(null);
                module.delegate = null;
            }
        }
    }
    module.lost_delegate = function(){
        console.log("determining replacement");
        var new_delegate = window._.chain( module.peers.get_active_peers() )
            .push( module.self.id )
            .reject( function(e){
                return e==="null";
            })
            .sort()     //the new delegate is the one with the alphabetically highest id
            .value()[0];
        if( new_delegate === module.self.id ){
            module.become_delegate();
        }
    };
    module.event.listen_for('delegate_transfer', module.set_delegate);
/******************************************/

    module.connect = function(peer_id){
        log("connecting to "+peer_id);
        var conn =  module.self.connect(peer_id);
        conn.on('data', function(req){
        //set message listener
	        log('rcd');
	        log(req); //TODO if we want source we need to put it here too
	        if(req.command) module.event.publish_event(req.command, req.data);
        });
    };
    
    module.make_connections = function(peer_list, callback){
        var cb = (typeof callback == 'function') ? callback : new Function(callback);
        var c= window._.chain(peer_list)
            .difference(module.peers.get_active_peers())
            .reject(function(e){
	            return e === module.self.id;
            })
            .each(function(p){
                log("connecting to "+p);
                module.connect(p);
            })
            .value();
        if(c.length == 0) log("There were no connections to make");
        setTimeout(cb, 0); //all requests have been made. NOTE: not when done
    };
    
    module.request_peers = function(){
        var delegate_connection = module.self.connections[module.delegate][0];
        if( delegate_connection.open ){
            module.send('peer_request', module.self.id, module.delegate);
        }else{
            setTimeout(module.request_peers, 500); //try again in a halfsec
        }
    }

    module.init = function(key, room_name, callback, debug){
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
      	module.self = new window.Peer(pdata); //TODO allow for setting ids (so they can persist via cookies)
      	
      	module.self.on('open', function(id){
      		log("my id is "+id);
      		
	        //prepare to accept connections (well in advance)
	        module.self.on('connection', function(conn){
		        log('connection recvd');
		        log(conn);
		        conn.on('data', function(req){
			        log('rcd');
			        //req.id = conn.peer; //TODO if source is necessary, include this
			        log(req);
		            if(req.command) module.event.publish_event(req.command, req.data);
		        });
	        });
      		
      		//connect to delegate and ask for peers
      		module.delegate = DB.get();
      		log("Delegate is:"+module.delegate);
	        if( !module.delegate ){
	            log('This room is empty.');
	            module.become_delegate();
	            window.setTimeout(cb,0,module.self);
            }else{
                log('connecting to delegate');
                module.connect(module.delegate);
                module.set_delegate(module.delegate); //this creates the disconnect listener
                module.event.listen_for('peer_request_response', function(data){
                    log('got a list of other peers');
                    setTimeout(function(){//so that we can move on to other stuff
                        module.make_connections(data, function(){
                            log("all connections made");
                            window.setTimeout(cb, 0, module.self);
                        });
                    },0);
                });
                setTimeout(module.request_peers, 0); //request peers
            }
      	});
    };
    
    module.send = function(command, data, dest){
        //send out a message to all peers
        log('trying to send a message');
        var message={};
        message.command = command;
        message.data = data;
        log(message);
        if(dest == undefined){
            window._.each(module.peers.get_active_peers(), function(peer){
                var c = module.self.connections[peer];
                log(c);
                if(c){
                    log("sending to "+peer);
                    c[0].send(message);
                }
            });
        }else{
            log("sending direct message to "+dest);
            module.self.connections[dest][0].send(message);
        }
    };
    
    return module;
}(window, DB));
