/* charset.h - LociTerm libtelnet handlers */
/* Created: Fri Mar 21 10:28:53 AM EDT 2025 malakai */

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


#ifndef LO_CHARSET_H
#define LO_CHARSET_H

/* global #defines */
/* these are some extra telnet telopt definitions that don't already appear in
 * libtelnet. */
#define TELNET_TELOPT_CHARSET 42

/* structs and typedefs */

/* exported global variable declarations */

/* exported function declarations */
const char *loci_charset_get_default();
void loci_charset_apply(proxy_conn_t *pc,const char *charset, int inform_server);
void loci_charset_send_request(proxy_conn_t *pc);
void loci_charset_handler(telnet_t *telnet, telnet_event_t *event, void *user_data);

#endif /* LO_CHARSET_H */
