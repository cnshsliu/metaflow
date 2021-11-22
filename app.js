const axios = require("axios").default;

const Client = {
  sleep: async function (miliseconds) {
    await new Promise((resolve) => setTimeout(resolve, miliseconds));
  },
  hasValue: function (obj) {
    if (obj === undefined) return false;
    if (obj === null) return false;
    if (obj === "") return false;

    return true;
  },
  isEmpty: function (obj) {
    return !this.hasValue(obj);
  },
  debug: function (flag) {
    Client.axiosOptions.debug = flag;
  },

  axiosOptions: {
    debug: false,
    baseURL: "http://localhost:5008",
    timeout: 3000, // 3 second, default: unlimited
    headers: {
      /* http headers */
    },
    responseType: "json",
    xsrfCookieName: "XSRF-TOKEN",
    xsrfHeaderName: "X-XSRF-TOKEN",
    onUploadProgress: function (progressEvent) {
      // Do whatever you want with the native progress event
    },
    onDownloadProgress: function (progressEvent) {
      // Do whatever you want with the native progress event
    },

    // `maxContentLength` defines the max size of the http response content in bytes allowed in node.js
    //maxContentLength: 20000,

    // `maxBodyLength` (Node only option) defines the max size of the http request content in bytes allowed
    maxBodyLength: 20000,
    maxRedirects: 3,
    /* httpAgent: new http.Agent({ keepAlive: true }),
     * httpsAgent: new https.Agent({ keepAlive: true }), */
  },

  setHeader: function (k, v) {
    Client.axiosOptions.headers[k] = v;
  },
  post: async function (uri, payload) {
    Client.axiosOptions.debug ?? console.log("post", uri, payload);
    let ret = await Client._post(uri, payload);
    return ret.data;
  },
  //return full response body.
  _post: async function (endpoint, payload) {
    try {
      let res = await axios.post(endpoint, payload, Client.axiosOptions);
      return res;
    } catch (err) {
      return err.response;
    }
  },
  _download: async function (uri, payload) {
    await axios.post(uri, payload, Client.axiosOptions);
  },
  get: async function (uri) {
    let ret = await Client._get(uri);
    if (ret && ret.data) return ret.data;
    else {
      console.log(uri);
      console.log(ret);
    }
  },

  _get: async function (uri) {
    try {
      let ret = await axios.get(uri, Client.axiosOptions);
      return ret;
    } catch (error) {
      return error.response;
    }
  },
  setServer: function (url) {
    Client.axiosOptions.baseUrl = url;
  },

  /* filter = {tplid:string; wfid:string; nodeid: string; workid:string;status: string; wfstatus: string} */
  getWorklist: async function (doer) {
    let filter = {};
    let repeatTimesUntilGotOne = 1;
    if (arguments.length === 2) {
      if (typeof arguments[1] === "number") {
        repeatTimesUntilGotOne = arguments[1];
      } else {
        filter = arguments[1];
      }
    } else if (arguments.length === 3) {
      if (typeof arguments[1] === "number") {
        repeatTimesUntilGotOne = arguments[1];
        filter = arguments[2];
      } else {
        repeatTimesUntilGotOne = arguments[2];
        filter = arguments[1];
      }
    }

    let res;
    for (let i = 0; i < repeatTimesUntilGotOne; i++) {
      res = await Client.post("/work/list", {
        doer: doer,
        filter: filter ? filter : {},
      });
      if (res.total > 0) break;
      else {
        await Client.sleep(1);
      }
    }
    return res;
  },

  createTemplate: async function (tplid) {
    let ret = await Client.post("/template/create", { tplid: tplid });
    return ret;
  },

  putTemplate: async function (tpl_data, tplid) {
    let ret = await Client.post("/template/put", {
      doc: tpl_data,
      tplid,
    });
    return ret;
  },

  importTemplateXML: async function (tplid, fileObj) {
    var formData = new FormData();
    formData.append("tplid", tplid);
    formData.append("file", fileObj, fileObj.name);
    let option = Client.axiosOptions;
    let token = this.getSessionToken();
    if (token === null) {
      console.error("No session token in localStorage");
      return;
    }
    option.headers = {
      "Content-Type": "multipart/form-data",
      authorization: token,
    };
    let res = await axios.post("/template/import", formData, option);
    return res;
  },

  readTemplate: async function (tpl_id) {
    let ret = await Client.post("/template/read", {
      tplid: tpl_id,
    });
    return ret;
  },
  readWorkflow: async function (wfid) {
    let ret = await Client.post("/workflow/read", {
      wfid: wfid,
    });
    return ret;
  },
  exportTemplate: async function (tpl_id) {
    //拷贝一份option，不影响原option
    let tmpOption = Client.axiosOptions;
    //需要设置responseType为blob
    //原axiosOptions中的responseType为json, 服务端返回的数据如果不是json格式, 数据会变为null
    tmpOption.responseType = "blob";
    axios
      .post(
        "/template/download",
        {
          tplid: tpl_id,
        },
        tmpOption
      )
      .then((response) => {
        //构建这个内部数据的访问url
        const url = window.URL.createObjectURL(new Blob([response.data]));
        //删除之前添加的临时连接
        $(".tempLink").remove();
        //创建一个新的临时连接
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `${tpl_id}.xml`); //or any other extension
        link.setAttribute("class", "tempLink");
        document.body.appendChild(link);
        //点击这个临时连接实现内容下载
        link.click();
      });
  },

  listTemplate: async function () {
    let ret = await Client.get("/template/list");
    return ret;
  },

  //Rename with internal _id
  renameTemplateWithIid: async function (_id, tplid) {
    let ret = await Client.post("/template/renamewithiid", {
      _id: _id,
      tplid: tplid,
    });
    return ret;
  },

  renameTemplate: async function (fromid, tplid) {
    let ret = await Client.post("/template/rename", {
      fromid: fromid,
      tplid: tplid,
    });
    return ret;
  },

  /**
   * return object {n: 1, deletedCount:1, ok:1}
   */
  deleteTemplate: async function (_id) {
    let ret = await Client.post("/template/delete", {
      _id: _id,
    });
    return ret;
  },

  /**
   * return object {n: 1, deletedCount:1, ok:1}
   */
  deleteTemplateByName: async function (tplid) {
    let ret = await Client.post("/template/delete/byname", {
      tplid: tplid,
    });
    return ret;
  },
  makeCopyOfTemplate: async function (_id) {
    let ret = await Client.post("/template/makecopy", {
      _id: _id,
    });
    return ret;
  },

  copyTo: async function (fromid, tplid) {
    let ret = await Client.post("/template/copyto", {
      fromid: fromid,
      tplid: tplid,
    });
    return ret;
  },
  getPbo: async function (wfid) {
    let ret = await Client.post("/workflow/getpbo", {
      wfid: wfid,
    });
    return ret;
  },
  setPbo: async function (wfid, pbo) {
    let ret = await Client.post("/workflow/setpbo", {
      wfid: wfid,
      pbo: pbo,
    });
    return ret;
  },

  startWorkflow: async function (tplid, wfid, teamid = "", pbo = "") {
    let ret = await Client.post("/workflow/start", {
      tplid: tplid,
      wfid: wfid,
      teamid: teamid,
      pbo: pbo,
    });
    return ret;
  },

  opWorkflow: async function (wfid, op) {
    return await Client.post("/workflow/op", { wfid, op });
  },

  pauseWorkflow: async function (wfid) {
    let ret = await Client.post("/workflow/pause", {
      wfid: wfid,
    });
    return ret;
  },

  resumeWorkflow: async function (wfid) {
    let ret = await Client.post("/workflow/resume", {
      wfid: wfid,
    });
    return ret;
  },
  stopWorkflow: async function (wfid) {
    let ret = await Client.post("/workflow/stop", {
      wfid: wfid,
    });
    return ret;
  },

  workflowGetList: async function (filter, aSort) {
    let ret = await Client.post("/workflow/list", {
      filter: filter,
      sortdef: aSort,
    });
    return ret;
  },

  workflowGetLatest: async function (filter) {
    let ret = await Client.post("/workflow/latest", {
      filter: filter,
    });
    return ret;
  },

  destroyWorkflow: async function (wfid) {
    let ret = await Client.post("/workflow/destroy", { wfid: wfid });
    return ret;
  },

  doWork: async function (doer, workid, kvars = {}, route = "DEFAULT") {
    let ret = await Client.post("/work/do", {
      doer: doer,
      workid: workid,
      route: route,
      kvars: kvars,
    });
    return ret;
  },
  doWorkByNode: async function (doer, wfid, nodeid, kvars = {}, route = "DEFAULT") {
    let ret = await Client.post("/work/do", {
      doer: doer,
      wfid: wfid,
      nodeid: nodeid,
      route: route,
      kvars: kvars,
    });
    return ret;
  },

  getKVars: async function (wfid, workid) {
    let ret = await Client.post(
      "/workflow/kvars",
      workid
        ? {
            wfid: wfid,
            workid: workid,
          }
        : {
            wfid: wfid,
          }
    );
    return ret;
  },

  getStatus: async function (wfid, workid) {
    let ret = "ST_UNKNOWN";
    if (workid)
      ret = await Client.post("/work/status", {
        wfid: wfid,
        workid: workid,
      });
    else
      ret = await Client.post("/workflow/status", {
        wfid: wfid,
      });

    return ret;
  },

  revoke: async function (wfid, workid) {
    let ret = await Client.post("/work/revoke", {
      tenant: Client.tenant,
      wfid: wfid,
      workid: workid,
    });
    return ret;
  },

  sendback: async function (doer, wfid, workid) {
    let ret = await Client.post("/work/sendback", {
      doer: doer,
      wfid: wfid,
      workid: workid,
    });
    return ret;
  },

  getWorkitemFullInfo: async function (wfid, workid) {
    let ret = await Client.post("/work/info", {
      workid: workid,
    });

    return ret;
  },

  uploadTeam: async function (name, tmap) {
    let payload = { teamid: name, tmap: tmap };
    let ret = await Client.post("/team/upload", payload);
    return ret;
  },
  setRole: async function (teamid, role, members) {
    let payload = { teamid: teamid, role: role, members: members };
    let ret = await Client.post("/team/role/set", payload);
    return ret;
  },
  addRoleMembers: async function (teamid, role, members) {
    let payload = { teamid: teamid, role: role, members: members };
    let ret = await Client.post("/team/role/member/add", payload);
    return ret;
  },
  deleteRoleMembers: async function (teamid, role, members) {
    let payload = { teamid: teamid, role: role, members: members };
    let ret = await Client.post("/team/role/member/delete", payload);
    return ret;
  },
  copyRole: async function (teamid, role, newrole) {
    let payload = { teamid: teamid, role: role, newrole: newrole };
    let ret = await Client.post("/team/role/copy", payload);
    return ret;
  },
  importTeamCSV: async function (teamid, fileObj) {
    if (this.isEmpty(teamid)) return;
    var formData = new FormData();
    formData.append("teamid", teamid);
    formData.append("file", fileObj, fileObj.name);
    let option = Client.axiosOptions;
    let token = this.getSessionToken();
    if (token === null) {
      console.error("No session token in localStorage");
      return;
    }
    option.headers = {
      "Content-Type": "multipart/form-data",
      authorization: token,
    };
    let res = await axios.post("/team/import", formData, option);
    return res;
  },

  getTeamFullInfo: async function (teamid) {
    let ret = await Client.get(`/team/fullinfo/${teamid}`);
    return ret;
  },

  getTeamList: async function (payload) {
    payload = payload ? payload : { limit: 1000 };
    ret = await Client.post("/team/search", payload);
    return ret;
  },

  getCallbackPoints: async function (cbpFilter) {
    let ret = await Client.post("/workflow/cbps", cbpFilter);
    return ret;
  },

  getLatestCallbackPoint: async function (cbpFilter) {
    let ret = await Client.post("/workflow/cbps/latest", cbpFilter);
    return ret;
  },

  /**
   *     workflow/docallback: callback to workflow
   *
   * @param {...} cbp - Callback point
   * @param {...} kvars - kvars to inject
   * @param {...} atts - attachments to inject
   *
   * @return {...}
   */
  doCallback: async function (cbp, route, kvars, atts) {
    let payload = { cbp: cbp };
    if (typeof route === "string") {
      payload.route = route;
      if (kvars) {
        payload.kvars = kvars;
        if (atts) {
          payload.atts = atts;
        }
      }
    } else if (typeof route === "object") {
      payload.route = "DEFAULT";
      payload.kvars = route;
      if (kvars) {
        payload.atts = kvars;
      }
    }
    let ret = await Client.post("/workflow/docallback", payload);
    return ret;
  },

  deleteTeam: async function (name) {
    let payload = { teamid: name };
    let ret = await Client.post("/team/delete", payload);
    return ret;
  },

  __checkError: function (ret) {
    if (ret.errors) {
      throw new Error(ret.errors);
    }
  },

  register: async function (username, password, email) {
    Client.setHeader("Content-type", "application/json");
    let endpoint = "/account/register";
    let payload = {
      username: username,
      password: password,
      email: email,
    };
    let response = await Client.post(endpoint, payload);
    if (response.sessionToken) {
      Client.setHeader("authorization", response.sessionToken);
    }
    return response;
  },
  verify: async function (token) {
    let response = await Client.post("/account/verifyEmail", { token });
    return response;
  },
  removeUser: async function (emailtobedel, adminpassword) {
    let ret = await Client.post("/account/remove", {
      emailtobedel: emailtobedel,
      password: adminpassword,
    });

    return ret;
  },

  login: async function (email, password) {
    Client.setHeader("Content-type", "application/json");
    let response = await Client.post("/account/login", {
      email: email,
      password: password,
    });
    if (response.sessionToken) {
      Client.setHeader("authorization", response.sessionToken);
    }
    return response;
  },

  getSessionToken: function () {
    if (localStorage) {
      let token = localStorage.getItem("sessionToken");
      if (token) {
        return `Bearer ${token}`;
      } else {
        return null;
      }
    } else {
      return null;
    }
  },
  setSessionToken: function (token) {
    if (token) {
      console.log("Client authorization token", token);
      Client.setHeader("authorization", `Bearer ${token}`);
    } else {
      if (localStorage) {
        let token = localStorage.getItem("sessionToken");
        if (token) {
          Client.setHeader("authorization", `Bearer ${token}`);
          console.log("Client authorization token", token);
        }
      }
    }
  },

  profile: async function () {
    let response = await Client.get("/account/profile/me");
    return response;
  },

  logout: async function (token) {
    if (token) {
      Client.setHeader("authorization", token);
    }
    let response = await Client.post("/account/logout", {});
    return response;
  },

  orgJoinCodeNew: async function (password) {
    let ret = await Client.post("/tnt/joincode/new", {
      password: password,
    });
    return ret;
  },
  orgJoin: async function (joincode) {
    let ret = await Client.post("/tnt/join", {
      joincode: joincode,
    });
    return ret;
  },
  orgMyOrg: async function () {
    let ret = await Client.post("/tnt/my/org");
    return ret;
  },
  orgMyOrgSetOrgmode: async function (orgmode, password) {
    let ret = await Client.post("/tnt/my/org/set/orgmode", {
      password: password,
      orgmode: orgmode,
    });
    return ret;
  },
  orgApprove: async function (ems, password) {
    let ret = await Client.post("/tnt/approve", { ems, password });
    return ret;
  },
  orgSetMemberGroup: async function (ems, password, member_group) {
    let ret = await Client.post("/tnt/member/setgroup", { ems, password, member_group });
    return ret;
  },
  myPerm: async function (what, op, instance_id = undefined) {
    let ret = await Client.post("/my/perm", { what, instance_id, op });
    return ret;
  },
  memberPerm: async function (member_email, what, op, instance_id = undefined) {
    let ret = await Client.post("/member/perm", { member_email, what, instance_id, op });
    return ret;
  },
};

module.exports = Client;
