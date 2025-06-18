/* charset.c - LociTerm libtelnet event handling code */
/* Created: Fri Mar 21 10:30:08 AM EDT 2025 malakai */

/* Copyright © 2025 Jeff Jahr <malakai@jeffrika.com>
 *
 * This file is part of LociTerm - Last Outpost Client Implementation Terminal
 *
 * LociTerm is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Lesser General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option)
 * any later version.
 *
 * LociTerm is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE.  See the GNU Lesser General Public License for
 * more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with LociTerm.  If not, see <https://www.gnu.org/licenses/>.
 */

#include <glib.h>
#include <stdio.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/types.h>
#include <unistd.h>
#include <arpa/inet.h>
#include <arpa/telnet.h>
#include <signal.h>
#include <libwebsockets.h>

#include "libtelnet.h"

#include "locid.h"
#include "debug.h"
#include "proxy.h"
#include "client.h"
#include "game.h"
#include "gamedb.h"
#include "telnet.h"

#include "charset.h"

/* ---- local #defines */

/* some definitions for the CHARSET protocol */
#define CHARSET_REQUEST 1
#define CHARSET_ACCEPTED 2
#define CHARSET_REJECTED 3
#define CHARSET_TTABLE_IS 4
#define CHARSET_TTABLE_REJECTED 5
#define CHARSET_TTABLE_ACK 6
#define CHARSET_TTABLE_NAK 7

/* local structs and typedefs */

/* global variable declarations */
const char *charset_supported[] = { "UTF-8","ASCII","US-ASCII","BIG5","GBK","CP437",NULL };
const char charset_default[] = "UTF-8";

/* function declarations */

/* code starts here. */

const char *loci_charset_get_default() {
	return(charset_default);
}

void loci_charset_apply(proxy_conn_t *pc,const char *charset, int send_charset_request) {

	locid_debug(DEBUG_TELNET,pc,"Setting charset to '%s'",charset);

	if( send_charset_request &&
		loci_game_telopt_active(pc,TELNET_TELOPT_CHARSET)
	) {
		loci_charset_send_request(pc);
	}
	return;
}


/* send charset subneg request for the pc's configured charset (in
 * pc->charset), or the charset_default if that is not set yet.  Note that this
 * does not modify the requested charset, or return any indication of success
 * or failure.  This just sends the telnet request. */
void loci_charset_send_request(proxy_conn_t *pc) {

	char buf[1024];
	char *b = buf;
	char *eob = b+sizeof(buf);
	char *charset = charset_default;
	game_conn_t *gc = pc->game;

	if(!(gc && gc->game_telnet)) return;
	if(!(loci_game_telopt_active(pc,TELNET_TELOPT_CHARSET))) {
		locid_debug(DEBUG_TELNET,pc,"CHARSET not negotiated.",charset);
		return;
	}

	if(pc->charset) {
		charset = pc->charset;
	} else {
		charset = loci_charset_get_default();
	}

	*b++ = CHARSET_REQUEST;
	/* add the preferred charset first. */
	int n = g_snprintf(b, eob - b, " %s", charset);
	if (n < 0 || n >= eob - b) {
		locid_debug(DEBUG_TELNET, pc, "Buffer overflow prevented while adding preferred charset.");
		return;
	}
	b += n;

	for (int i = 0; charset_supported[i] != NULL; i++) {
		/* add the supported charsets next. */
		if (strcmp(charset, charset_supported[i])) {
			n = g_snprintf(b, eob - b, " %s", charset_supported[i]);
			if (n < 0 || n >= eob - b) {
				locid_debug(DEBUG_TELNET, pc, "Buffer overflow prevented while adding supported charset.");
				return;
			}
			b += n;
		}
	}

	locid_debug(DEBUG_TELNET,pc,"Sending 'CHARSET_REQUEST%s'",buf+1);
	telnet_subnegotiation(gc->game_telnet,TELNET_TELOPT_CHARSET,buf,b-buf);

	return;
}

void loci_charset_recv_request(proxy_conn_t *pc, telnet_event_t *event) {

	game_conn_t *gc = pc->game;
	if(!gc) return;

	if(event->sub.size == 0) {
		/* wtf is this? */
		locid_debug(DEBUG_TELNET,pc,"Got an empty SB?");
		return;
	}

	switch(event->sub.buffer[0]) { /* the SB command */

		case CHARSET_REQUEST: {
			char *requestbuf = strndup(event->sub.buffer+1,event->sub.size-1);
			char *request = requestbuf;

			if( !strncmp(request,"TTABLE",6) ) {
				locid_debug(DEBUG_TELNET,pc,"Ignoring TTABLE <version> found in request.");
				request+=6;
				if(*request != '\0') { /* skip over the version octet. */
					request++;
				}
			}

			char sep = *request++;
			if(sep != ' ') {
				locid_debug(DEBUG_TELNET,pc,"Server used %c as the seperator.",sep);
				for(char *c=request;*c;c++) {
					if(*c == sep) *c=' ';
				}
			}

			locid_debug(DEBUG_TELNET,pc,"char set list: '%s'",request);

			/* foreach offered charset, find if we support it, and accept the
			 * first one we support. */
			char *accept = NULL;
			for(char *c=request;*c;c++) {
				char *end;
				for(end=c;*end;end++) {
					if(*end == sep) break;
				}
				for(int i=0;charset_supported[i]!=NULL;i++) {
					if(!strncasecmp(charset_supported[i],c,end-c)) {
						accept = charset_supported[i];
						break;
					}
				}
				if(accept) break;
			}

			if(!accept) { 
				char nak[] = { CHARSET_REJECTED };
				locid_debug(DEBUG_TELNET,pc,"No supported charset offered. Sending CHARSET_REJECTED.");
				telnet_subnegotiation(gc->game_telnet,TELNET_TELOPT_CHARSET,nak,sizeof(nak));
			} else {
				char out[1024];
				snprintf(out,sizeof(out),"%c%s",CHARSET_ACCEPTED,accept);
				locid_debug(DEBUG_TELNET,pc,"sending CHARSET_ACCEPTED %s'",accept);
				telnet_subnegotiation(gc->game_telnet,TELNET_TELOPT_CHARSET,out,strlen(out));
				loci_proxy_set_charset(pc,accept);
				loci_client_send_charset(pc);
			}

			free(requestbuf);

		} break;

		case CHARSET_REJECTED: { 
			/* game didn't like what we accepted? errrrororr... */
			locid_debug(DEBUG_TELNET,pc,"Telnet CHARSET, Server rejected our charset offer?");
		} break;

		case CHARSET_TTABLE_IS: {
			/* not supported, ignored. */
			char nak[] = { CHARSET_TTABLE_NAK };
			telnet_subnegotiation(gc->game_telnet,TELNET_TELOPT_CHARSET,nak,sizeof(nak));
			locid_debug(DEBUG_TELNET,pc,"NAK'ed SB CHARSET_TTABLE_IS from server.");
		} break;

		default: {
		} break;

	}
}

void loci_charset_handler(telnet_t *telnet, telnet_event_t *event, void *user_data) {

	game_conn_t *gc = (game_conn_t *)user_data;
	proxy_conn_t *pc = gc->pc;
	
	switch (event->type) {

		case TELNET_EV_DO: {
			if(event->neg.telopt != TELNET_TELOPT_CHARSET) return;
			loci_charset_send_request(pc);
		} break;

		case TELNET_EV_SUBNEGOTIATION: {
			if(event->sub.telopt != TELNET_TELOPT_CHARSET) return;
			loci_charset_recv_request(pc,event);
		} break;

		default: {
			locid_debug(DEBUG_TELNET,pc,"CHARSET unhandled event: %d", event->type);
			break;
		}
	}
}
