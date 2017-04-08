/*
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 *
 * File: comments.controller.coffee
 */

import * as angular from "angular"

let module = angular.module("taigaHistory");

class CommentsController {
    canAddCommentPermission:any
    name:any

    static initClass() {
        this.$inject = [];
    }

    constructor() {}

    initializePermissions() {
        return this.canAddCommentPermission = `comment_${this.name}`;
    }
}
CommentsController.initClass();

module.controller("CommentsCtrl", CommentsController);