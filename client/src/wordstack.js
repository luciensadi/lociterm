// wordstack.js - keep track of clicked upon words.
// Created: Tue Nov 19 09:51:03 PM EST 2024
// $Id: wordstack.js,v 1.4 2024/12/10 03:29:15 malakai Exp $

// Copyright © 2024 Jeff Jahr <malakai@jeffrika.com>
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

class WordStackEntry {
	constructor(type="prompt") {

		this.type = type;
		this.label = "";
		this.data = "";
		this.onclick = undefined;

		return(this);
	}

	eq(b) {
		if(b === undefined) {
			return(false);
		}
		if( this.type != b.type ) {
			return(false);
		}
		if( this.label != b.label ) {
			return(false);
		}
		if( this.data != b.data ) {
			return(false);
		}
		return(true);
	}

}

class WordStack {

	constructor(lociterm) {

		this.lociterm = lociterm;
		this.stack = [];
		this.atmost = 6;
		this.menuid = "";

	}


	push(wse) {

		let lastselection = this.stack[this.stack.length -1];
		if( !(wse.eq(lastselection))) {
			this.stack.push(wse);
			if(this.stack.length > this.atmost) {
				this.stack = this.stack.slice(1);
			}
			this.updateMenu();
		}
	}

	addLink(e,text,link) {
		let wse = new WordStackEntry("uri");
		wse.data = text;
		// use the scheme to adjust the label.
		let scheme = text.split(":")[0].toLowerCase();
		let path = text.slice(text.indexOf(":")+1);
		if( scheme === "send" ) {
			wse.label = decodeURIComponent(path);
		} else if ( scheme === "prompt") {
			wse.label = decodeURIComponent(path) + " ...";
		} else {
			wse.label = `🌐${wse.data}`;
		}
		wse.onclick = () => { this.lociterm.osc8handler.sendLink(e,text,link) };
		this.push(wse);
	}

	addSelection(e,selection) {

		if(selection === "") return(false);

		const punctuation = '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~\n';

		let words = selection.split(" ");
		if(words.length !== 1) {
			return(false);
		}

		selection = words[0].toLowerCase();  // just the first word, thanks!

		/* no beginning punctuation. */
		while( punctuation.includes(selection[0])) {
			selection = selection.slice(1);
		}
		/* no ending punctuation. */
		while( punctuation.includes(selection[selection.length-1])) {
			selection = selection.slice(0,-1);
		}
		if(selection === "") return(false);

		let wse = new WordStackEntry();
		let enc = encodeURIComponent(selection);
		wse.data = `prompt:${enc}`;
		wse.label = `${selection.slice(0,20)} ...`;
		wse.onclick = () => { this.lociterm.osc8handler.sendLink(e,wse.data,undefined) };

		this.push(wse);

		return(true);
	}

	getSelection(offset) {
		if (offset === undefined) {
			offset = 0;
		}
		let ret = this.stack[this.stack.length -(1+offset)];
		if(ret !== undefined) {
			return(ret);
		}
		return( "" );
	}

	openMenu() {
		if(this.stack.length == 0) {
			this.lociterm.menuhandler.update_oob_message(
				"📋︎ Double-tap on a word to select it."
			);
			return;
		}
		this.lociterm.menuhandler.open(`${this.menuid}`);
	}

	closeMenu() {
		this.lociterm.menuhandler.close(`${this.menuid}`);
	}

	toggleMenu() {
		if(this.stack.length == 0) {
			this.lociterm.menuhandler.update_oob_message(
				"📋︎ Double-tap a word to add."
			);
			return;
		}
		this.lociterm.menuhandler.toggle(`${this.menuid}`);
	}

	updateMenu() {
		
		// find the menu item to update.
		let menudiv = document.getElementById(`${this.menuid}`);
		if( menudiv === null) {
			return;
		}

		// Could pop the first div and add at the end... but screw it.  Just
		// erase the whole thing and rebuild.  its easier than having both a
		// create and update method.
		menudiv.innerText = "";
		while( menudiv.children[0] !== undefined ) {
			menudiv.children[0].remove();
		}
		for(let i=0; i<this.stack.length ;i++) {
			let d = document.createElement('div');
			d.classList.add('send');
			d.classList.add('wordstack');
			let wse = this.stack[i];
			d.innerText = wse.label;
			d.onclick = wse.onclick;
			menudiv.appendChild(d);
		}
	}
}

export { WordStack };
