/* scan.c - <comment goes here> */
/* Created: Sat Jan 25 01:55:54 PM EST 2025 malakai */
/* Copyright © 2025 Jeffrika Heavy Industries */
/* $Id: $ */

/* Copyright © 2022-2025 Jeff Jahr <malakai@jeffrika.com>
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

#include <libwebsockets.h>
#include <string.h>
#include <signal.h>
#include <glib.h>
#include <uv.h>

#include "debug.h"
#include "proxy.h"
#include "connect.h"
#include "gamedb.h"

#include "scan.h"

/* local #defines */

/* structs and typedefs */

/* local variable declarations */
static uv_timer_t scan_main_timer;

/* local function declarations */

void uvcb(uv_timer_t *handle) {
	locid_debug(DEBUG_SCAN,NULL,"Boop?");
	return;
}

void scanner_init(uv_loop_t *uvloop,struct locid_conf *config) {
	uv_timer_init(uvloop,&scan_main_timer);
	uv_timer_start(&scan_main_timer, uvcb, 1000, 2000);
}

