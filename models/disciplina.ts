﻿import app = require("teem");
import appsettings = require("../appsettings");
import DataUtil = require("../utils/dataUtil");

interface DisciplinaUsuario {
	id: number;
	iddisciplina: number;
	idusuario: number;
	turma: string;
}

interface Disciplina {
	id: number;
	idsistema: string;
	idcatalogo: string;
	anosemestre: number;
	nome: string;
	exclusao?: string | null;
	criacao: string;

	professores?: any[];
	nomesprofessor?: string[];
	idsprofessor?: number[];
	turmas?: string[];
}

class Disciplina {
	private static validar(disciplina: Disciplina): string | null {
		if (!disciplina)
			return "Dados inválidos";

		disciplina.id = parseInt(disciplina.id as any);

		disciplina.idsistema = (disciplina.idsistema || "").normalize().trim();
		if (!disciplina.idsistema || disciplina.idsistema.length > 32)
			return "Código de sistema inválido";

		disciplina.idcatalogo = (disciplina.idcatalogo || "").normalize().trim().toUpperCase();
		if (!disciplina.idcatalogo || disciplina.idcatalogo.length > 16)
			return "Código de catálogo da disciplina inválido";

		disciplina.anosemestre = parseInt(disciplina.anosemestre as any);
		if (isNaN(disciplina.anosemestre))
			return "Ano/semestre inválido";

		const ano = (disciplina.anosemestre / 100) | 0;
		const semestre = (disciplina.anosemestre % 100);

		if (ano < 2000 || ano > 9999)
			return "Ano inválido";

		if (semestre !== 1 && semestre !== 2)
			return "Semestre inválido";

		disciplina.nome = (disciplina.nome || "").normalize().trim();
		if (!disciplina.nome || disciplina.nome.length > 100)
			return "Nome inválido";

		if (!disciplina.idsprofessor)
			disciplina.idsprofessor = [];

		if (!Array.isArray(disciplina.idsprofessor))
			disciplina.idsprofessor = [disciplina.idsprofessor as any];

		if (!disciplina.turmas && (disciplina.turmas as any) != "")
			disciplina.turmas = [];

		if (!Array.isArray(disciplina.turmas))
			disciplina.turmas = [disciplina.turmas as any];

		if (disciplina.idsprofessor.length !== disciplina.turmas.length)
			return "Quantidade inválida de professores/turmas";

		for (let i = disciplina.idsprofessor.length - 1; i >= 0; i--) {
			if (isNaN(disciplina.idsprofessor[i] = parseInt(disciplina.idsprofessor[i] as any)))
				return "Id de professor inválido";

			if (disciplina.turmas[i])
				disciplina.turmas[i] = disciplina.turmas[i].normalize().trim().toUpperCase();

			// Âncora
			if (!disciplina.turmas[i])
				disciplina.turmas[i] = null;
			else if (disciplina.turmas[i].length > 16)
				return "Turma inválida";
		}

		return null;
	}

	public static listar(): Promise<Disciplina[]> {
		return app.sql.connect(async (sql) => {
			return (await sql.query("select id, idsistema, idcatalogo, anosemestre, nome, date_format(criacao, '%d/%m/%Y') criacao from disciplina")) || [];
		});
	}

	public static listarDeUsuario(idusuario: number): Promise<Disciplina[]> {
		return app.sql.connect(async (sql) => {
			return (await sql.query("select d.id, d.idsistema, d.idcatalogo, d.anosemestre, d.nome, du.turma, date_format(d.criacao, '%d/%m/%Y') criacao from disciplina_usuario du inner join disciplina d on d.id = du.iddisciplina where du.idusuario = ?", [idusuario])) || [];
		});
	}

	public static obter(id: number): Promise<Disciplina> {
		return app.sql.connect(async (sql) => {
			const lista: Disciplina[] = await sql.query("select id, idsistema, idcatalogo, anosemestre, nome, date_format(criacao, '%d/%m/%Y') criacao from disciplina where id = ?", [id]);

			const disciplina = (lista && lista[0]) || null;

			if (disciplina)
				disciplina.professores = (await sql.query("select u.nome, du.idusuario, du.turma from disciplina_usuario du inner join usuario u on u.id = du.idusuario where du.iddisciplina = ? order by du.turma asc, u.nome asc", [id])) || [];

			return disciplina;
		});
	}

	public static async criar(disciplina: Disciplina): Promise<string | number> {
		if (!disciplina || !(disciplina.idcatalogo = (disciplina.idcatalogo || "").trim().toUpperCase()))
			return "Código de catálogo da disciplina inválido";

		try {
			// @@@
			//const response = await app.request.json.get(appsettings.urlIntegracaoDisciplina + encodeURIComponent(disciplina.idcatalogo));
			//if (!response || !response.success)
			//	return "Erro de comunicação com o servidor de integração";
			disciplina.idsistema = "XXX";
			disciplina.nome = "Teste";
		} catch (ex: any) {
			return "Erro de comunicação com o servidor de integração: " + (ex.message || ex.toString());
		}

		const res = Disciplina.validar(disciplina);
		if (res)
			return res;

		return app.sql.connect(async (sql) => {
			try {
				await sql.beginTransaction();

				await sql.query("insert into disciplina (idsistema, idcatalogo, anosemestre, nome, criacao) values (?, ?, ?, ?, ?)", [disciplina.idsistema, disciplina.idcatalogo, disciplina.anosemestre, disciplina.nome, DataUtil.horarioDeBrasiliaISOComHorario()]);
			} catch (e) {
				if (e.code) {
					switch (e.code) {
						case "ER_DUP_ENTRY":
							return "Já existe uma disciplina com o código de sistema " + disciplina.idsistema;
						default:
							throw e;
					}
				} else {
					throw e;
				}
			}

			try {
				disciplina.id = await sql.scalar("select last_insert_id()") as number;

				if (disciplina.idsprofessor && disciplina.turmas) {
					for (let i = disciplina.idsprofessor.length - 1; i >= 0; i--)
						await sql.query("insert into disciplina_usuario (iddisciplina, idusuario, turma) values (?, ?, ?)", [disciplina.id, disciplina.idsprofessor[i], disciplina.turmas[i]]);
				}

				await sql.commit();

				return disciplina.id;
			} catch (e) {
				if (e.code) {
					switch (e.code) {
						case "ER_DUP_ENTRY":
							return "Professores repetidos na disciplina";
						case "ER_NO_REFERENCED_ROW":
						case "ER_NO_REFERENCED_ROW_2":
							return "Professor não encontrado";
						default:
							throw e;
					}
				} else {
					throw e;
				}
			}
		});
	}

	public static async editar(disciplina: Disciplina): Promise<string> {
		const res = Disciplina.validar(disciplina);
		if (res)
			return res;

		return app.sql.connect(async (sql) => {
			try {
				await sql.beginTransaction();

				await sql.query("update disciplina set anosemestre = ?, nome = ? where id = ?", [disciplina.anosemestre, disciplina.nome, disciplina.id]);

				const antigos: DisciplinaUsuario[] = (await sql.query("select id, idusuario, turma from disciplina_usuario where iddisciplina = ?", [disciplina.id])) || []
				const atualizar: DisciplinaUsuario[] = [];
				const novos: DisciplinaUsuario[] = [];

				if (disciplina.idsprofessor && disciplina.turmas) {
					for (let i = disciplina.idsprofessor.length - 1; i >= 0; i--)
						novos.push({
							id: 0,
							iddisciplina: disciplina.id,
							idusuario: disciplina.idsprofessor[i],
							turma: disciplina.turmas[i]
						});
				}

				for (let i = antigos.length - 1; i >= 0; i--) {
					const antigo = antigos[i];

					for (let j = novos.length - 1; j >= 0; j--) {
						const novo = novos[j];
						if (antigo.idusuario === novo.idusuario) {
							antigos.splice(i, 1);
							novos.splice(j, 1);
							if (antigo.turma !== novo.turma) {
								antigo.turma = novo.turma;
								atualizar.push(antigo);
							}
							break;
						}
					}
				}

				// Tenta reaproveitar os id's antigos se precisar adicionar algo novo
				for (let i = novos.length - 1; i >= 0; i--) {
					if (!antigos.length)
						break;

					const antigo = antigos.pop();
					antigo.idusuario = novos[i].idusuario;
					antigo.turma = novos[i].turma;

					atualizar.push(antigo);

					novos.splice(i, 1);
				}

				for (let i = antigos.length - 1; i >= 0; i--)
					await sql.query("delete from disciplina_usuario where id = ?", [antigos[i].id]);

				for (let i = atualizar.length - 1; i >= 0; i--)
					await sql.query("update disciplina_usuario set idusuario = ?, turma = ? where id = ?", [atualizar[i].idusuario, atualizar[i].turma, atualizar[i].id]);

				for (let i = novos.length - 1; i >= 0; i--)
					await sql.query("insert into disciplina_usuario (iddisciplina, idusuario, turma) values (?, ?, ?)", [novos[i].iddisciplina, novos[i].idusuario, novos[i].turma]);

				await sql.commit();

				return null;
			} catch (e) {
				if (e.code) {
					switch (e.code) {
						case "ER_DUP_ENTRY":
							return "Professores repetidos na disciplina";
						case "ER_NO_REFERENCED_ROW":
						case "ER_NO_REFERENCED_ROW_2":
							return "Professor não encontrado";
						default:
							throw e;
					}
				} else {
					throw e;
				}
			}
		});
	}

	public static async excluir(id: number): Promise<string> {
		return app.sql.connect(async (sql) => {
			await sql.query("update disciplina set exclusao = ? where id = ? and exclusao is null", [DataUtil.horarioDeBrasiliaISOComHorario(), id]);

			return (sql.affectedRows ? null : "Usuário não encontrado");
		});
	}
};

export = Disciplina;
