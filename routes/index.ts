import app = require("teem");
import appsettings = require("../appsettings");
import Disciplina = require("../models/disciplina");
import Usuario = require("../models/usuario");

class IndexRoute {
	public static async index(req: app.Request, res: app.Response) {
		let u = await Usuario.cookie(req);
		if (!u)
			res.redirect(app.root + "/login");
		else
			res.redirect(app.root + "/disciplina");
			//res.render("index/index", {
			//	layout: "layout-sem-form",
			//	titulo: "Dashboard",
			//	usuario: u
			//});
	}

	@app.http.all()
	@app.route.methodName("p/:tokenQR")
	public static async p(req: app.Request, res: app.Response) {
		res.render("index/participacao", {
			layout: "layout-externo",
			titulo: "Participação",
			ssoRedirPresenca: appsettings.ssoRedirPresenca + encodeURIComponent(req.params["tokenQR"] as string)
		});
	}

	@app.http.all()
	public static async r(req: app.Request, res: app.Response) {
		const r = await Disciplina.confirmarParticipacao(req.query["i"] as string, req.query["token"] as string);

		if (r)
			res.render("index/erro", {
				layout: "layout-externo",
				mensagem: r
			});
		else
			res.render("index/participacaook", {
				layout: "layout-externo",
				titulo: "Participação Confirmada"
			});
	}

	@app.http.all()
	public static async login(req: app.Request, res: app.Response) {
		let u = await Usuario.cookie(req);
		if (!u) {
			const token = req.query["token"] as string;

			if (token) {
				const [mensagem, u] = await Usuario.efetuarLogin(token, res);
				if (mensagem)
					res.render("index/login", { layout: "layout-externo", mensagem: mensagem, ssoRedir: appsettings.ssoRedir });
				else
					res.redirect(app.root + "/");
			} else {
				res.render("index/login", { layout: "layout-externo", mensagem: null, ssoRedir: appsettings.ssoRedir });
			}
		} else {
			res.redirect(app.root + "/");
		}
	}

	public static async acesso(req: app.Request, res: app.Response) {
		let u = await Usuario.cookie(req);
		if (!u)
			res.redirect(app.root + "/login");
		else
			res.render("index/acesso", {
				layout: "layout-sem-form",
				titulo: "Sem Permissão",
				usuario: u
			});
	}

	public static async perfil(req: app.Request, res: app.Response) {
		let u = await Usuario.cookie(req);
		if (!u)
			res.redirect(app.root + "/");
		else
			res.render("index/perfil", {
				titulo: "Meu Perfil",
				usuario: u
			});
	}

	public static async logout(req: app.Request, res: app.Response) {
		let u = await Usuario.cookie(req);
		if (u)
			await Usuario.efetuarLogout(u, res);
		res.redirect(app.root + "/");
	}
}

export = IndexRoute;
