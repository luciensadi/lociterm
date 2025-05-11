// mcmp.js - Mud Client Media Protocol
// Created: Thu May  8 10:19:33 AM EDT 2025

// Implemented from the MCMP "Client.Media 1" definition at
// https://wiki.mudlet.org/w/Standards:MUD_Client_Media_Protocol

// Copyright © 2025 Jeff Jahr <malakai@jeffrika.com>
//
// This file is part of LociTerm - Last Outpost Client Implementation Terminal
//
// LociTerm is free software: you can redistribute it and/or modify it under
// the terms of the GNU Lesser General Public License as published by the Free
// Software Foundation, either version 3 of the License, or (at your option)
// any later version.
//
// LociTerm is distributed in the hope that it will be useful, but WITHOUT ANY
// WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
// FOR A PARTICULAR PURPOSE.  See the GNU Lesser General Public License for
// more details.
//
// You should have received a copy of the GNU Lesser General Public License
// along with LociTerm.  If not, see <https://www.gnu.org/licenses/>.

// an object for storing a single sound file reference.
class LociMediaElement extends Audio {

	// controls rate and direction of fade
	#faderate = 0.0;
	
	// The number of msec between volume adjustments during a fade out/in
	#fadedelay = 100;

	#fadeid = 0;

	// private loop counter for tracking the number of plays.
	#loops_for = 1;
	#loops_left = 0;

	defaultOptions = {
		volume: "50",
		type: "sound",
		loops: "1",
		continue: "true"
	};

	constructor(src=undefined, mcmp={}) {
		super();
		this.mcmp = new Object();
		this.mcmp = Object.assign(this.defaultOptions,mcmp);
		if(this.mcmp.loops) {
			this.loops = this.mcmp.loops;
		}
		super.src = src;
		let cb = (e) => {
			// console.log(`${this.caption} ended - ${this.#loops_left} of ${this.#loops_for}`);
			if(this.#loops_for >= 1) {
				this.#loops_left--;
				if(this.#loops_left > 0) {
					this.currentTime = (this.mcmp.start || 0);
					this.loop = false;
					this.play();
				} else {
					this.pause();
					this.#loops_left = this.#loops_for;
				}
			}
		};
		this.addEventListener("ended",cb);
		return(this);
	}

	// default callback for printing a caption.
	showCaption(e,caption,action) { 
		console.log(`[${caption} ${action}]`)
	};

	play() {
		this.showCaption(this,this.caption,"plays");
		return(super.play());
	}

	pause() {
		// show ending messages on long sound effects.
		if((this.duration >= 5.0) || (this.#loops_for != 1)) {
			this.showCaption(this,this.caption,"ends");
		}
		return(super.pause());
	}

	// getters and setters
	
	// sets the media loops counter, and adds the ended event to re-play();
	set loops(value) {
		if(value == undefined) {
			value = 1;
		}
		if(value == -1) {
			this.loop = true;
			return;
		} 
		this.#loops_for = value;
		this.#loops_left = value;
	}

	// returns how many loops are remaining, or -1 if permalooped.
	get loops() {
		if(this.loop == true) {
			return(-1);
		} else {
			return(this.#loops_left);
		}
	}

	// getter function that returns either the cc found in the mcmp definition
	// sent by the game, or one that is created on the fly from other fields.
	// (mcmp.cc is a non-standard addtion to the mcmp protocol.)
	get caption() {
		let cc = "";
		if( this.mcmp.caption != undefined ) {
			cc = this.mcmp.caption;
		} else {
			if( this.mcmp.type != undefined ) {
				cc += `${this.mcmp.type} `;
			}
			if( this.mcmp.key != undefined ) {
				cc += `${this.mcmp.key} `;
			}
			if( this.mcmp.name != undefined ) {
				cc += `"${this.mcmp.name}"`;
			}
			if( cc == "" ) {
				cc = "A subtle sound effect";
			}
		}
		return(cc);
	}

	// sets the cc field in the mcmp definition.
	set caption(value) {
		this.mcmp.caption = value;
	}

	// implments the matching rules required by the mcmp stop method.
	matches(message) {
		if(message.name != undefined) {
			if(this.mcmp.name == message.name) return(true);
		}
		if(message.tag != undefined) {
			if(this.mcmp.tag == message.tag) return(true);
		}
		if(message.type != undefined) {
			if(this.mcmp.type == message.type) return(true);
		}
		if(message.priority != undefined) {
			if(this.mcmp.priority <= message.priority) return(true);
		}
		if(message.key != undefined) {
			if(this.mcmp.key == message.key) return(true);
		}
		return(false);
	}

	// linearly fade the stream to 0 volume over msec seconds.
	fadeout(msec=5000) {
		if(msec == 0) {
			this.#faderate = 0.0;
			return;
		}
		if(typeof(msec) != 'number') { msec = 5000; }
		this.#faderate = -1.0 * this.volume / msec * this.#fadedelay;
		this.showCaption(this,this.caption,"fades out");
		this.#fader();
	}

	// linearly fade the stream to mcmp.volume over msec seconds.
	fadein(msec=5000) {
		if(msec == 0) {
			this.#faderate = 0.0;
			return;
		}
		if(typeof(msec) != 'number') { msec=5000; }
		let vol = ((this.mcmp.volume/100.0) || 1.0);
		this.#faderate = vol / msec * this.#fadedelay;
		this.showCaption(this,this.caption,"fades in");
		this.#fader();
	}

	// recalls itself on a settimer to achieve the desired fade.
	#fader() {
		if(this.#faderate == 0.0) {
			// Do not reschedule
			return;
		}
		let newvol = this.volume + this.#faderate;
		if( ((this.#faderate < 0) && (newvol > 0.0)) ||
			((this.#faderate > 0) && (newvol < ((this.mcmp.volume/100.0) || 1.0)))
		) {
			this.volume = newvol;
			clearTimeout(this.#fadeid);
			this.#fadeid = setTimeout( ()=>{ this.#fader() ; }, this.#fadedelay );
			return;
		} else {
			// target reached, if we were fading out, stop the playback.
			if(this.#faderate < 0) {
				this.#faderate = 0.0;
				this.pause();
			}
		}
	}

}

// The class definition for the GMCP Client.Media handler.
class ClientMedia {

	// a map containing LociMedia elements, by resolved URI
	mediaObjs = new Map();

	// Should closed captioning be enabled?
	cc = true;

	// Should samples be played at all?  Note that when disabled, samples will
	// still download when requested, but they will not be .play()'ed.  To
	// completely skip downloading mcmp samples, the Client.Media protocol
	// needs to be removed from the client's GMCP Supports list!
	enabled = true;

	constructor(gmcp) {
		// Get us a path back to the parent
		this.gmcp = gmcp;
		this.lociterm = gmcp.lociterm;

		this.codeName = "ClientMedia";  // Required!
		this.moduleName = "Client.Media";  // Required!
		this.moduleVersion  = "1";           // Required!

		// other vars specific to this protocol
		this.defaultUrl = "";
	
		// Init the module callbacks.  The m variable is the JSON object
		// corresponding to the GMCP message.
		this.gmcp.addCommand("client.media.default",(m)=>this.setDefault(m));
		this.gmcp.addCommand("client.media.load",(m)=>this.load(m));
		this.gmcp.addCommand("client.media.play",(m)=>this.play(m));
		this.gmcp.addCommand("client.media.stop",(m)=>this.stop(m));
	}

	init() {  // Required!
		// will be called just *after* gmcp sends a Core.Supports message,
		// which MAY happen more than once.  (Consider additional calls to be a
		// re-init of the protocol.)
	}

	goodbye() { // Required!
		// will be called on reciept of core.goodbye. Can be used to clean up
		// any held state.
		this.mediaObjs.forEach( (media,src) => {
			media.pause();
		});
	}

	// getters and setters

	// Functions called by gmcp.addCommand handler should go here.

	// Client.Media.Default message format
	// 
	// Yes	"url"	<url>
	// -- Resource location where the media file may be downloaded.
	// -- Last character must be a / (slash).
	setDefault(message) {
		this.defaultUrl = message.url;
		if(this.defaultUrl.slice(-1) != "/") {
			console.warn(`GMCP ${this.moduleName}.default malformed url: ${message.url}`);
			this.defaultUrl += "/";
		}
	}

	// Client.Media.Load message format
	// 
	// Yes	"name"	<file name>	
	// -- Name of the media file.
	// -- May contain directory information (i.e. weather/lightning.mp3).
	// 
	// Maybe	"url"	<url>	
	// -- Resource location where the media file may be downloaded.
	// -- Last character must be a / (slash).
	// -- Only required if a url was not set with Client.Media.Default.
	load(message) {

		let src = this.#buildURI(message.url,message.name);
		let media = this.mediaObjs.get(src);
		if(media === undefined) {
			// make a new one.
			media = new LociMediaElement(src,message);
			media.showCaption = this.showCaption;
			this.mediaObjs.set(src,media);
		}
		media.load();
	}

	// Client.Media.Play message format
	//
	// Yes	"name"	<file name>	 	
	// -- Name of the media file.
	// -- May contain directory information (i.e. weather/lightning.mp3).
	//
	// Maybe	"url"	<url>	 	
	// --Resource location where the media file may be downloaded.
	// --Last character must be a / (slash).
	// --Only required if the file is to be downloaded remotely and a url was not set above with Client.Media.Default or Client.Media.Load.
	//
	// No	"type"	"sound", "music" or "video"	"sound"	
	// --Identifies the type of media.
	//
	// No	"tag"	<tag>	 	
	// --Helps categorize media.
	//
	// No	"volume"	1 to 100	50	
	// --Relative to the volume set on the player's client.
	//
	// No	"fadein"	<msec>	 	
	// --Volume increases, or fades in, ranged across a linear pattern from one to the volume set with the "volume" key.
	// --Start position: Start of media.
	// --End position: Start of media plus the number of milliseconds (msec) specified.
	// --1000 milliseconds = 1 second.
	//
	// No	"fadeout"	<msec>	 	
	// --Volume decreases, or fades out, ranged across a linear pattern from the volume set with the "volume" key to one.
	// --Start position: End of the media minus the number of milliseconds (msec) specified.
	// --End position: End of the media.
	// --1000 milliseconds = 1 second.
	//
	// No	"start"	<msec>	0	
	// --Begin play at the specified position in milliseconds.
	// --1000 milliseconds = 1 second.
	//
	// No	"finish"	<msec>	0	
	// --End play at the specified position in milliseconds.
	// --1000 milliseconds = 1 second.
	//
	// No	"loops"	-1, or >= 1	1	
	// --Number of iterations that the media plays.
	// --A value of -1 allows the sound or music to loop indefinitely.
	//
	// No	"priority"	1 to 100	 	
	// --Halts the play of current or future played media files with a lower priority while this media plays.
	//
	// No	"continue"	true or false	true	
	// --Continues playing matching new music files when true.
	// --Restarts matching new music files when false.
	//
	// No	"key"	<key>	 	
	// --Uniquely identifies media files with a "key" that is bound to their "name" or "url".
	// --Halts the play of current media files with the same "key" that have a different "name" or "url" while this media plays.
	
	play(message) {
		// console.log(`GMCP ${this.moduleName} play: ${JSON.stringify(message)}`);

		// media objects are stored in a map, key'd off of the fully resolved
		// URI.
		let src = this.#buildURI(message.url,message.name);
		let media = this.mediaObjs.get(src);

		if(media === undefined) {
			// make a new one.
			media = new LociMediaElement(src,message);
			media.showCaption = this.showCaption;
			this.mediaObjs.set(src,media);
		} else {
			// Tamarindo says, on a play, any 'missing' properties (like loops:)
			// should be reset to defaults.  Which means, the message in a play
			// completely replaces any previous play message.
			media.mcmp = Object.assign(media.defaultOptions,message);
		}

		
		// import any directives from the message into the object.
		if(message.volume) {
			media.volume = 1.0 * message.volume / 100.0;
		}
		if(message["continue"] === false) {
			media.currentTime = 0.0;
		}
		if(message.loops == -1) {
			media.loop = true; /* loop (singular) is an Audio() property. */
		} else {
			media.loop = false; /* loop (singular) is an Audio() property. */
			media.loops = message.loops;
		}
		if(message.start !== undefined && typeof(message.start) === "number") {
			media.currentTime = message.start;
		}
		if(message.finish !== undefined && typeof(message.finish) === "number") {
			// Currently unhandled.  Audio() doesn't have a straightforeward way to
			// control it?
		}

		// Spec says to first stop playing everything that matches, except for
		// this media if it is already going.
		let halt = new Object();
		halt.priority = message.priority;
		halt.key = message.key;
		this.stopMatchingMedia(halt,media);

		if(this.enabled) {
			media.muted = false;
		} else {
			media.muted = true;
		}

		// Then trigger this media to play, if it isn't already doing so.
		if( (media.paused || media.ended)
		) {
			media.fading = false;
			media.volume = ((media.mcmp.volume/100.0) || 1.0);

			media.play()
			.then(()=>{
				if(media.mcmp.fadein > 0) {
					media.volume = 0.0;
					media.fadein(media.mcmp.fadein);
				} 
			})
			.catch((err)=>{console.log(`mcmp play: error ${err}`);})
		}
	}

	// Client.Media.Stop message format
	//
	// No	"name"	<file name>
	// -- Stops playing media by name matching the value specified.
	//
	// No	"type"	"sound", "music" or "video"
	// -- Stops playing media by type matching the value specified.
	//
	// No	"tag"	<tag>
	// -- Stops playing media by tag matching the value specified.
	//
	// No	"priority"	1 to 100
	// -- Stops playing media with priority less than or equal to the value.
	//
	// No	"key"	<key>
	// -- Stops playing media by key matching the value specified.
	//
	// No	"fadeaway"	true or false
	// -- Decrease volume from the current position for a given duration, then
	// stops the track.  Given duration is the lesser of the remaining track
	// duration or the fadeout specified in Client.Media.Play.  If fadeout was
	// not specified in Client.Media.Play, then the optional fadeout parameter
	// from Client.Media.Stop or a default of 5000 milliseconds will be
	// applied.
	// 
	// No	"fadeout"
	// -- Default duration in milliseconds to decrease volume to the end of the
	// track.  Only used if fadeout was not defined in Client.Media.Play.
	//
	stop(message) {
		//let show = `GMCP ${this.moduleName} stop: ${JSON.stringify(message)}}`;
		//this.lociterm.terminal.writeln(show);
		this.stopMatchingMedia(message);
	}

	// utilitiy functions go here

	// This is the real backend for the stop() method.  The exceptfor argument
	// is a media object that is NOT stopped even though it matches the
	// criteria.  (so that play() has a way to stop all matching media EXCEPT
	// for itself.)
	stopMatchingMedia(message,exceptfor=undefined) {
		// Stop playing everything that matches.
		this.mediaObjs.forEach( (media,src) => {
			if(media == exceptfor) {
				return;
			}
			let hardstop = (Object.keys(message).length == 0);
			if( (hardstop || media.matches(message)) && 
				(media.ended != true) &&
				(media.paused != true)
			) {
				if( !hardstop ) {
					if( (message.fadeaway == "true") ||
						(media.mcmp.fadeout > 0)
					) {
						media.fadeout(media.mcmp.fadeout);
					} else {
						media.pause();
					}
				} else {
					media.pause();
				}
			} 
		});
	}

	// can be set on a locimedia element
	showCaption = (e,caption,action) => {
		if(this.cc === true) {
			if(action != "" && action != "plays") {
				this.lociterm.terminal.writeln(`〖${caption} ${action}〗`);
			} else {
				this.lociterm.terminal.writeln(`〖${caption}〗`);
			}
		}
	}

	// Resolves the full URI using the filename and either the url component in
	// the message, or the uri value set by default()
	#buildURI(uri,filename) {
		if(uri === undefined) {
			uri = this.defaultUrl;
		}
		return(`${uri}${filename}`);
	}

}

export { ClientMedia };
