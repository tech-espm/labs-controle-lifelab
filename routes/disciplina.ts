import app = require("teem");
import appsettings = require("../appsettings");
import Disciplina = require("../models/disciplina");
import Usuario = require("../models/usuario");

class DisciplinaRoute {
	public static async criar(req: app.Request, res: app.Response) {
		let u = await Usuario.cookie(req);
		if (!u || !u.admin) {
			res.redirect(app.root + "/acesso");
		} else {
			const hoje = new Date();
			let ano = hoje.getFullYear();
			let mes = hoje.getMonth() + 1;
			let semestre = 1;
			if (mes >= 6 && mes <= 11)
				semestre = 2;
			else if (mes === 12)
				ano++;

			res.render("disciplina/criar", {
				titulo: "Criar Disciplina",
				textoSubmit: "Criar",
				usuario: u,
				item: null,
				ano,
				semestre,
				disciplinas: await Disciplina.buscar(ano, semestre, true)
			});
		}
	}

	public static async editar(req: app.Request, res: app.Response) {
		let u = await Usuario.cookie(req);
		if (!u || !u.admin) {
			res.redirect(app.root + "/acesso");
		} else {
			let id = parseInt(req.query["id"] as string);
			let item: Disciplina = null;
			if (isNaN(id) || !(item = await Disciplina.obter(id)))
				res.render("index/nao-encontrado", {
					layout: "layout-sem-form",
					usuario: u
				});
			else
				res.render("disciplina/editar", {
					titulo: "Editar Disciplina",
					usuario: u,
					item,
					professores: await Usuario.listarCombo()
				});
		}
	}

	public static async listar(req: app.Request, res: app.Response) {
		let u = await Usuario.cookie(req);
		if (!u || !u.admin)
			res.redirect(app.root + "/acesso");
		else
			res.render("disciplina/listar", {
				layout: "layout-tabela",
				titulo: "Gerenciar Disciplinas",
				datatables: true,
				usuario: u,
				lista: await Disciplina.listar()
			});
	}

	public static async index(req: app.Request, res: app.Response) {
		let u = await Usuario.cookie(req);
		if (!u)
			res.redirect(app.root + "/acesso");
		else
			res.render("disciplina/index", {
				layout: "layout-sem-form",
				titulo: "Minhas Disciplinas",
				datatables: true,
				usuario: u,
				lista: await Disciplina.listarDeUsuario(u.id)
			});
	}

	public static async verificacao(req: app.Request, res: app.Response) {
		let u = await Usuario.cookie(req);
		if (!u) {
			res.redirect(app.root + "/acesso");
		} else {
			let id = parseInt(req.query["id"] as string);
			let disciplina: any, ocorrencia: any;
			if (isNaN(id))
				res.render("index/nao-encontrado", {
					layout: "layout-sem-form",
					usuario: u
				});
			else if (!(disciplina = await Disciplina.usuarioTemDisciplinaObj(id, u.id, true)) || (ocorrencia = await Disciplina.obterOcorrenciaNaoConcluida(id, u.id)) === false)
				res.redirect(app.root + "/acesso");
			else
				res.render("disciplina/verificacao", {
					titulo: "Verificação de Presença da Disciplina",
					layout: "layout-card",
					datepicker: true,
					usuario: u,
					disciplina,
					ocorrencia
				});
		}
	}

	@app.route.methodName("qr/:estado/:limite/:tokenQR")
	public static async qr(req: app.Request, res: app.Response) {
		res.render("disciplina/qr", {
			layout: "layout-externo",
			titulo: "Código QR",
			clipboard: true,
			estado: parseInt(req.params["estado"] as string),
			limite: parseInt(req.params["limite"] as string),
			link: appsettings.urlPresenca + encodeURIComponent(req.params["tokenQR"] as string)
		});
	}

	public static async presenca(req: app.Request, res: app.Response) {
		let u = await Usuario.cookie(req);
		if (!u) {
			res.redirect(app.root + "/acesso");
		} else {
			let id = parseInt(req.query["id"] as string);
			let disciplina: any;
			if (isNaN(id))
				res.render("index/nao-encontrado", {
					layout: "layout-sem-form",
					usuario: u
				});
			else if (!(disciplina = await Disciplina.usuarioTemDisciplinaObj(id, u.id, false)))
				res.redirect(app.root + "/acesso");
			else
				res.render("disciplina/presenca", {
					titulo: "Presenças da Disciplina",
					layout: "layout-card",
					datepicker: true,
					usuario: u,
					disciplina
				});
		}
	}
}

export = DisciplinaRoute;
