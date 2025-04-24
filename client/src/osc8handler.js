// ocs8handler.js - OCS8 Hyperlink handler
// Created: Wed Apr 23 11:45:16 PM EDT 2025

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

class OSC8Handler {

	constructor(lociterm) {

		this.lociterm = lociterm;
		this.linkpopup = undefined;

		let linkHandler = {
			activate: (e,text,range) => {this.sendLink(e,text,range); this.removeLinkPopup(e,text,range);},
			hover: (e,text,range) => { this.showLinkPopup(e,text,range);},
			leave: (e,text,range) => { this.removeLinkPopup(e,text,range); },
			allowNonHttpProtocols: true
		}
		return(linkHandler);
	};

	supportedLinkScheme(scheme) {
		const schemes = new Set(['send','prompt','http','https','mailto']);
		return(schemes.has(scheme));
	}

	// Custom OSC8 link handler 
	sendLink(e,text,range) {

		let scheme = text.split(":")[0];
		let path = text.slice(text.indexOf(":")+1);

		if(!this.supportedLinkScheme(scheme)) { 
			console.warn(`Unsupported OSC8 hyperlink '${text}'`);
			return;
		}

		if(scheme === "send" || scheme == "prompt") {

			let cmd = decodeURIComponent(path);

			if(scheme === "send") {
				cmd += "\n";
			} else {
				cmd += " ";
			}
			// bah I hate the nerfbar.  But I do want this routed through the
			// nerfbar if its active, so it has to route through menuhandler.
			this.lociterm.menuhandler.send(cmd);
			return;
		}

		// fragment snagged from xterm.js/src/browser/OscLinkProvider.ts
		const answer = confirm(`Do you want to navigate to ${text}?`);
		if(answer) {
			const newWindow = window.open();
			if(newWindow) {
				try {
					newWindow.opener = null;
				} catch {
					// no-op, Electron can throw
				}
				newWindow.location.href = text;
			}
		}
		return;
	
	}

	// code and structure based on https://xtermjs.org/docs/guides/link-handling/ 
	removeLinkPopup(e,text,range) {
		if(this.linkpopup) {
			this.linkpopup.remove();
			this.linkpopup = undefined;
		}
	}

	// code and structure based on https://xtermjs.org/docs/guides/link-handling/ 
	showLinkPopup(e,text,range) {

		let oldlinkpopup = this.linkpopup;

		let scheme = text.split(":")[0];
		let path = text.slice(text.indexOf(":")+1);

		if(!this.supportedLinkScheme(scheme)) return;

		let popup = document.createElement('div');
		popup.classList.add('xterm-link-popup');
		popup.style.position = 'absolute';

		if(scheme === "send") {
			path = decodeURIComponent(path);
			popup.innerText = path;
		} else if (scheme === "prompt") {
			path = decodeURIComponent(path) + " ...";
			popup.innerText = path;
		} else {
			popup.innerText = text;
		}

		const topElement = e.target.parentNode;
		if(topElement !== null) {
			topElement.appendChild(popup);
		} else {
			document.getElementsByClassName("xterm-screen")[0].appendChild(popup);
		}

		let Y = e.clientY - (popup.clientHeight / 2);
		let X = e.clientX - (popup.clientWidth / 2);
		popup.style.top = `${Y}px`
		popup.style.left = `${X}px`
		popup.style.opacity = `1.0`;

		this.linkpopup = popup;

		setTimeout( 
			()=>{ if(this.linkpopup !== undefined) {
					this.linkpopup.style.opacity = "0";
				}
			}, 
			1000
		);
		if(oldlinkpopup !== undefined) {
			oldlinkpopup.remove();
		}
	}
}

export { OSC8Handler };
