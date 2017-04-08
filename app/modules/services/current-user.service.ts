/*
 * Copyright (C) 2014-2017 Taiga Agile LLC <taiga@taiga.io>
 *
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
 * File: current-user.service.coffee
 */

import {groupBy, defineImmutableProperty} from "../../ts/utils"
import * as angular from "angular"
import * as Immutable from "immutable"

class CurrentUserService {
    projectsService:any
    storageService:any
    rs:any
    _user:any
    _projects: Immutable.Map<any, any>;
    _projectsById: Immutable.Map<any, any>;
    _joyride:any
    projects:any

    static initClass() {
        this.$inject = [
            "tgProjectsService",
            "$tgStorage",
            "tgResources"
        ];
    }

    constructor(projectsService, storageService, rs) {
        this.projectsService = projectsService;
        this.storageService = storageService;
        this.rs = rs;
        this._user = null;
        this._projects = Immutable.Map();
        this._projectsById = Immutable.Map();
        this._joyride = null;

        defineImmutableProperty(this, "projects", () => { return this._projects; });
        defineImmutableProperty(this, "projectsById", () => { return this._projectsById; });
    }

    isAuthenticated() {
        if (this.getUser() !== null) {
            return true;
        }
        return false;
    }

    getUser() {
        if (!this._user) {
            let userData = this.storageService.get("userInfo");

            if (userData) {
                userData = Immutable.fromJS(userData);
                this.setUser(userData);
            }
        }

        return this._user;
    }

    removeUser() {
        this._user = null;
        this._projects = Immutable.Map();
        this._projectsById = Immutable.Map();
        return this._joyride = null;
    }

    setUser(user) {
        this._user = user;

        return this._loadUserInfo();
    }

    bulkUpdateProjectsOrder(sortData) {
        return this.projectsService.bulkUpdateProjectsOrder(sortData).then(() => {
            return this.loadProjects();
        });
    }

    loadProjects() {
        return this.projectsService.getProjectsByUserId(this._user.get("id"))
            .then(projects => this.setProjects(projects));
    }

    disableJoyRide(section) {
        if (!this.isAuthenticated()) {
            return;
        }

        if (section) {
            this._joyride[section] = false;
        } else {
            this._joyride = {
                backlog: false,
                kanban: false,
                dashboard: false
            };
        }

        return this.rs.user.setUserStorage('joyride', this._joyride);
    }

    loadJoyRideConfig() {
        return new Promise((function(resolve) {
            if (this._joyride !== null) {
                resolve(this._joyride);
                return;
            }

            return this.rs.user.getUserStorage('joyride')
                .then(config => {
                    this._joyride = config;
                    return resolve(this._joyride);
            }).catch(() => {
                    //joyride not defined
                    this._joyride = {
                        backlog: true,
                        kanban: true,
                        dashboard: true
                    };

                    this.rs.user.createUserStorage('joyride', this._joyride);

                    return resolve(this._joyride);
            });
        }.bind(this)));
    }

    _loadUserInfo() {
        return Promise.all([
            this.loadProjects()
        ]);
    }

    setProjects(projects) {
        this._projects = this._projects.set("all", projects);
        this._projects = this._projects.set("recents", projects.slice(0, 10));

        this._projectsById = Immutable.fromJS(groupBy(projects.toJS(), p => p.id));

        return this.projects;
    }

    canCreatePrivateProjects() {
        let user = this.getUser();
        if ((user.get('max_private_projects') !== null) && (user.get('total_private_projects') >= user.get('max_private_projects'))) {
            return {
                valid: false,
                reason: 'max_private_projects',
                type: 'private_project',
                current: user.get('total_private_projects'),
                max: user.get('max_private_projects')
            };
        }

        return {valid: true};
    }

    canCreatePublicProjects() {
        let user = this.getUser();

        if ((user.get('max_public_projects') !== null) && (user.get('total_public_projects') >= user.get('max_public_projects'))) {
            return {
                valid: false,
                reason: 'max_public_projects',
                type: 'public_project',
                current: user.get('total_public_projects'),
                max: user.get('max_public_projects')
            };
        }

        return {valid: true};
    }

    canAddMembersPublicProject(totalMembers) {
        let user = this.getUser();

        if ((user.get('max_memberships_public_projects') !== null) && (totalMembers > user.get('max_memberships_public_projects'))) {
            return {
                valid: false,
                reason: 'max_members_public_projects',
                type: 'public_project',
                current: totalMembers,
                max: user.get('max_memberships_public_projects')
            };
        }

        return {valid: true};
    }

    canAddMembersPrivateProject(totalMembers) {
        let user = this.getUser();

        if ((user.get('max_memberships_private_projects') !== null) && (totalMembers > user.get('max_memberships_private_projects'))) {
            return {
                valid: false,
                reason: 'max_members_private_projects',
                type: 'private_project',
                current: totalMembers,
                max: user.get('max_memberships_private_projects')
            };
        }

        return {valid: true};
    }

    canOwnProject(project) {
        let membersResult, result;
        let user = this.getUser();
        if (project.get('is_private')) {
            result = this.canCreatePrivateProjects();
            if (!result.valid) { return result; }

            membersResult = this.canAddMembersPrivateProject(project.get('total_memberships'));
            if (!membersResult.valid) { return membersResult; }
        } else {
            result = this.canCreatePublicProjects();
            if (!result.valid) { return result; }

            membersResult = this.canAddMembersPublicProject(project.get('total_memberships'));
            if (!membersResult.valid) { return membersResult; }
        }

        return {valid: true};
    }
}
CurrentUserService.initClass();

angular.module("taigaCommon").service("tgCurrentUserService", CurrentUserService);