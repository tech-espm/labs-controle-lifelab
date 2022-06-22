import app = require("teem");
import Disciplina = require("../models/disciplina");
import Usuario = require("../models/usuario");

class DisciplinaRoute {
	public static async criar(req: app.Request, res: app.Response) {
		let u = await Usuario.cookie(req);
		if (!u || !u.admin)
			res.redirect(app.root + "/acesso");
		else
			res.render("disciplina/criar", {
				titulo: "Criar Disciplina",
				textoSubmit: "Criar",
				usuario: u,
				item: null
			});
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
					item: item,
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
				layout: "layout-tabela",
				titulo: "Minhas Disciplinas",
				datatables: true,
				usuario: u,
				lista: await Disciplina.listarDeUsuario(u.id)
			});
	}
}

export = DisciplinaRoute;
