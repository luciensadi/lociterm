/* scan.h - periodic database entry scanner */
/* Created: Sat Jan 25 01:55:54 PM EST 2025 malakai */
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

#ifndef LO_SCAN_H
#define LO_SCAN_H

#include "locid.h"

/* global #defines */

/* structs and typedefs */

/* exported global variable declarations */

/* exported function declarations */
void scanner_init(uv_loop_t *uvloop,struct locid_conf *config);

#endif /* LO_SCAN_H */
