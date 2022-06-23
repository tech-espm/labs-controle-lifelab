import app = require("teem");
import Disciplina = require("../../models/disciplina");
import Usuario = require("../../models/usuario");

class DisciplinaApiRoute {
	public static async buscar(req: app.Request, res: app.Response) {
		const u = await Usuario.cookie(req, res, true);
		if (!u)
			return;

		const ret = await Disciplina.buscar(parseInt(req.query["ano"] as string), parseInt(req.query["semestre"] as string), true);

		if (typeof ret === "string")
			res.status(400);

		res.json(ret);
	}

	@app.http.post()
	public static async criar(req: app.Request, res: app.Response) {
		const u = await Usuario.cookie(req, res, true);
		if (!u)
			return;

		const ret = await Disciplina.criar(req.body);

		if (typeof ret === "string")
			res.status(400);

		res.json(ret);
	}

	@app.http.post()
	public static async editar(req: app.Request, res: app.Response) {
		const u = await Usuario.cookie(req, res, true);
		if (!u)
			return;

		const erro = await Disciplina.editar(req.body);

		if (erro) {
			res.status(400).json(erro);
			return;
		}

		res.sendStatus(204);
	}

	@app.http.delete()
	public static async excluir(req: app.Request, res: app.Response) {
		const u = await Usuario.cookie(req, res, true);
		if (!u)
			return;

		const id = parseInt(req.query["id"] as string);

		if (isNaN(id)) {
			res.status(400).json("Id inválido");
			return;
		}

		const erro = await Disciplina.excluir(id);

		if (erro) {
			res.status(400).json(erro);
			return;
		}

		res.sendStatus(204);
	}

	@app.http.post()
	public static async iniciarOcorrencia(req: app.Request, res: app.Response) {
		const u = await Usuario.cookie(req, res);
		if (!u)
			return;

		const ret = await Disciplina.iniciarOcorrencia(u.id, req.body);

		if (typeof ret === "string")
			res.status(400);

		res.json(ret);
	}

	@app.http.post()
	public static async alterarLimiteOcorrencia(req: app.Request, res: app.Response) {
		const u = await Usuario.cookie(req, res);
		if (!u)
			return;

		const ret = await Disciplina.alterarLimiteOcorrencia(u.id, req.body);

		if (typeof ret === "string")
			res.status(400);

		res.json(ret);
	}

	@app.http.post()
	public static async proximoPasso(req: app.Request, res: app.Response) {
		const u = await Usuario.cookie(req, res);
		if (!u)
			return;

		const ret = await Disciplina.proximoPasso(u.id, req.body);

		if (typeof ret === "string")
			res.status(400);

		res.json(ret);
	}
}

export = DisciplinaApiRoute;
