﻿import app = require("teem");
import appsettings = require("../appsettings");
import DataUtil = require("../utils/dataUtil");
import Timestamp = require("../utils/timestamp");
import IntegracaoMicroservices = require("./integracao/microservices");

interface DisciplinaUsuario {
	id: number;
	iddisciplina: number;
	idusuario: number;
	ancora: number;
	turma: string;
}

interface DisciplinaOcorrencia {
	id: number;
	iddisciplina: number;
	idusuario: number;
	data: number;
	limite: number;
	minimo: number;
	minimoMinutos: number;
	estado: number;
	qr1: number;
	qr2: number;
	qr3: number;
	qr4: number;
}

interface Disciplina {
	id: number;
	idsistema: string;
	idcurso: string;
	idsecao: string
	idcatalogo: string;
	ano: number;
	semestre: number;
	eletiva: number;
	nome: string;
	exclusao?: string | null;
	criacao: string;

	professores?: any[];
	nomesprofessor?: string[];
	idsprofessor?: number[];
	ancoras?: number[];
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

		disciplina.idcurso = (disciplina.idcurso || "").normalize().trim();
		if (!disciplina.idcurso || disciplina.idcurso.length > 16)
			return "Código de curso inválido";

		disciplina.idsecao = (disciplina.idsecao || "").normalize().trim();
		if (!disciplina.idsecao || disciplina.idsecao.length > 16)
			return "Código de seção inválido";

		disciplina.eletiva = (disciplina.idsecao.toUpperCase().startsWith("EL") ? 1 : 0);

		disciplina.idcatalogo = (disciplina.idcatalogo || "").normalize().trim().toUpperCase();
		if (!disciplina.idcatalogo || disciplina.idcatalogo.length > 16)
			return "Código de catálogo inválido";

		disciplina.ano = parseInt(disciplina.ano as any);
		if (isNaN(disciplina.ano) || disciplina.ano < 2000 || disciplina.ano > 9999)
			return "Ano inválido";

		disciplina.semestre = parseInt(disciplina.semestre as any);
		if (isNaN(disciplina.semestre) || (disciplina.semestre !== 1 && disciplina.semestre !== 2))
			return "Semestre inválido";

		disciplina.nome = (disciplina.nome || "").normalize().trim();
		if (!disciplina.nome || disciplina.nome.length > 100)
			return "Nome inválido";

		if (!disciplina.idsprofessor)
			disciplina.idsprofessor = [];

		if (!Array.isArray(disciplina.idsprofessor))
			disciplina.idsprofessor = [disciplina.idsprofessor as any];

		if (!disciplina.ancoras)
			disciplina.ancoras = [];

		if (!Array.isArray(disciplina.ancoras))
			disciplina.ancoras = [disciplina.ancoras as any];

		if (!disciplina.turmas && (disciplina.turmas as any) != "")
			disciplina.turmas = [];

		if (!Array.isArray(disciplina.turmas))
			disciplina.turmas = [disciplina.turmas as any];

		if (disciplina.idsprofessor.length !== disciplina.turmas.length || disciplina.idsprofessor.length !== disciplina.ancoras.length)
			return "Quantidade inválida de professores/âncoras/turmas";

		for (let i = disciplina.idsprofessor.length - 1; i >= 0; i--) {
			if (isNaN(disciplina.idsprofessor[i] = parseInt(disciplina.idsprofessor[i] as any)))
				return "Id de professor inválido";

			disciplina.ancoras[i] = (disciplina.ancoras[i] == 1 ? 1 : 0);

			if (!(disciplina.turmas[i] = disciplina.turmas[i].normalize().trim().toUpperCase()) || disciplina.turmas[i].length > 16)
				return "Turma inválida";
		}

		return null;
	}

	public static listar(): Promise<Disciplina[]> {
		return app.sql.connect(async (sql) => {
			return (await sql.query("select id, idsistema, idsecao, ano, semestre, nome, date_format(criacao, '%d/%m/%Y') criacao from disciplina where exclusao is null")) || [];
		});
	}

	public static listarDeUsuario(idusuario: number, ano: number, semestre: number): Promise<Disciplina[]> {
		return app.sql.connect(async (sql) => {
			return (await sql.query("select d.id, d.idsecao, d.ano, d.semestre, d.nome, du.ancora, du.turma, date_format(d.criacao, '%d/%m/%Y') criacao from disciplina_usuario du inner join disciplina d on d.id = du.iddisciplina where du.idusuario = ? and d.ano = ? and d.semestre = ? and d.exclusao is null order by d.ano desc, d.semestre desc, d.nome asc", [idusuario, ano, semestre])) || [];
		});
	}

	public static obter(id: number): Promise<Disciplina> {
		return app.sql.connect(async (sql) => {
			const lista: Disciplina[] = await sql.query("select id, idsistema, idsecao, idcurso, idcatalogo, ano, semestre, nome, date_format(criacao, '%d/%m/%Y') criacao from disciplina where id = ? and exclusao is null", [id]);

			const disciplina = (lista && lista[0]) || null;

			if (disciplina)
				disciplina.professores = (await sql.query("select u.nome, du.idusuario, du.ancora, du.turma from disciplina_usuario du inner join usuario u on u.id = du.idusuario where du.iddisciplina = ? order by du.turma asc, u.nome asc", [id])) || [];

			return disciplina;
		});
	}

	public static async buscar(ano: number, semestre: number, ordenar: boolean): Promise<{ cataloG_NBR: string, clasS_SECTION: string, coursE_TITLE_LONG: string, courseid: string, crsE_ID: string, strm: string }[]> {
		if (!ano)
			throw new Error("Ano inválido");

		if (!semestre)
			throw new Error("Semestre inválido");

		const disciplinas = await IntegracaoMicroservices.obterDisciplinas(ano, semestre);
		if (!disciplinas)
			throw new Error("Erro de comunicação com o servidor de integração");

		for (let i = disciplinas.length - 1; i >= 0; i--) {
			const d = disciplinas[i];
			d.courseid = (d.courseid || "").trim();
			d.clasS_SECTION = (d.clasS_SECTION || "").trim();
			d.coursE_TITLE_LONG = (d.coursE_TITLE_LONG || "").trim();
		}

		if (ordenar) {
			const compare = new Intl.Collator("pt-br", { sensitivity: "base" }).compare;
			disciplinas.sort((a, b) => {
				const c = compare(a.coursE_TITLE_LONG, b.coursE_TITLE_LONG);
				return (c || (a.clasS_SECTION < b.clasS_SECTION ? -1 : 1));
			});
		}

		return disciplinas;
	}

	public static async criar(disciplina: Disciplina): Promise<string | number> {
		if (!disciplina)
			return 

		const disciplinas = await Disciplina.buscar(parseInt(disciplina.ano as any), parseInt(disciplina.semestre as any), false);

		let ok = false;
		for (let i = disciplinas.length - 1; i >= 0; i--) {
			if (disciplinas[i].courseid === disciplina.idsistema) {
				ok = true;
				disciplina.idcurso = disciplinas[i].crsE_ID;
				disciplina.idsecao = disciplinas[i].clasS_SECTION;
				disciplina.idcatalogo = disciplinas[i].cataloG_NBR;
				disciplina.nome = disciplinas[i].coursE_TITLE_LONG;
				break;
			}
		}

		if (!ok)
			return "Disciplina " + disciplina.idsistema + " não encontrada para o ano/semestre " + disciplina.ano + "/" + disciplina.semestre;

		const res = Disciplina.validar(disciplina);
		if (res)
			return res;

		return app.sql.connect(async (sql) => {
			try {
				await sql.beginTransaction();

				await sql.query("insert into disciplina (idsistema, idcurso, idsecao, idcatalogo, ano, semestre, eletiva, nome, criacao) values (?, ?, ?, ?, ?, ?, ?, ?, ?)", [disciplina.idsistema, disciplina.idcurso, disciplina.idsecao, disciplina.idcatalogo, disciplina.ano, disciplina.semestre, disciplina.eletiva, disciplina.nome, DataUtil.horarioDeBrasiliaISOComHorario()]);
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
						await sql.query("insert into disciplina_usuario (iddisciplina, idusuario, ancora, turma) values (?, ?, ?, ?)", [disciplina.id, disciplina.idsprofessor[i], disciplina.ancoras[i], disciplina.turmas[i]]);
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

				await sql.query("update disciplina set nome = ? where id = ? and exclusao is null", [disciplina.nome, disciplina.id]);

				if (!sql.affectedRows)
					return "Disciplina não encontrada";

				const antigos: DisciplinaUsuario[] = (await sql.query("select id, idusuario, ancora, turma from disciplina_usuario where iddisciplina = ?", [disciplina.id])) || []
				const atualizar: DisciplinaUsuario[] = [];
				const novos: DisciplinaUsuario[] = [];

				if (disciplina.idsprofessor && disciplina.turmas) {
					for (let i = disciplina.idsprofessor.length - 1; i >= 0; i--)
						novos.push({
							id: 0,
							iddisciplina: disciplina.id,
							idusuario: disciplina.idsprofessor[i],
							ancora: disciplina.ancoras[i],
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
							if (antigo.ancora !== novo.ancora || antigo.turma !== novo.turma) {
								antigo.ancora = novo.ancora;
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
					antigo.ancora = novos[i].ancora;
					antigo.turma = novos[i].turma;

					atualizar.push(antigo);

					novos.splice(i, 1);
				}

				for (let i = antigos.length - 1; i >= 0; i--)
					await sql.query("delete from disciplina_usuario where id = ?", [antigos[i].id]);

				for (let i = atualizar.length - 1; i >= 0; i--)
					await sql.query("update disciplina_usuario set idusuario = ?, ancora = ?, turma = ? where id = ?", [atualizar[i].idusuario, atualizar[i].ancora, atualizar[i].turma, atualizar[i].id]);

				for (let i = novos.length - 1; i >= 0; i--)
					await sql.query("insert into disciplina_usuario (iddisciplina, idusuario, ancora, turma) values (?, ?, ?, ?)", [novos[i].iddisciplina, novos[i].idusuario, novos[i].ancora, novos[i].turma]);

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
			await sql.query("update disciplina set idsistema = concat('@', id, ':', idsistema), exclusao = ? where id = ? and exclusao is null", [DataUtil.horarioDeBrasiliaISOComHorario(), id]);

			return (sql.affectedRows ? null : "Disciplina não encontrada");
		});
	}

	private static async usuarioTemDisciplinaInterno(sql: app.Sql, id: number, idusuario: number, admin: boolean, apenasAncora: boolean): Promise<boolean> {
		if (admin)
			return true;

		const ancora: number = await sql.scalar("select du.ancora from disciplina_usuario du inner join disciplina d on d.id = du.iddisciplina where du.iddisciplina = ? and du.idusuario = ? and d.exclusao is null", [id, idusuario]);
		return (ancora === 1) || ((ancora === 0) && !apenasAncora);
	}

	private static async usuarioTemDisciplinaObjInterno(sql: app.Sql, id: number, idusuario: number, admin: boolean, apenasAncora: boolean): Promise<any> {
		const disciplinas: any[] = (admin ?
			await sql.query("select d.id, d.idsistema, d.idcurso, d.idsecao, d.ano, d.semestre, d.eletiva, d.nome, coalesce(du.ancora, 0) ancora, coalesce(du.turma, '') turma from disciplina d left join disciplina_usuario du on du.iddisciplina = d.id and du.idusuario = ? where d.id = ? and d.exclusao is null", [idusuario, id]) :
			await sql.query("select d.id, d.idsistema, d.idcurso, d.idsecao, d.ano, d.semestre, d.eletiva, d.nome, du.ancora, du.turma from disciplina_usuario du inner join disciplina d on d.id = du.iddisciplina where du.iddisciplina = ? and du.idusuario = ? and d.exclusao is null", [id, idusuario])
		);
		return (disciplinas && disciplinas.length && (admin || disciplinas[0].ancora || !apenasAncora)) ? disciplinas[0] : null;
	}

	public static async usuarioTemDisciplinaObj(id: number, idusuario: number, admin: boolean, apenasAncora: boolean): Promise<any> {
		if (!id)
			return null;

		return app.sql.connect(async (sql) => {
			return await Disciplina.usuarioTemDisciplinaObjInterno(sql, id, idusuario, admin, apenasAncora);
		});
	}

	public static async obterEmailDosProfessores(id: number): Promise<any[]> {
		return app.sql.connect(async (sql) => {
			return await sql.query("select u.nome, u.email from disciplina d inner join disciplina_usuario du on du.iddisciplina = d.id inner join usuario u on u.id = du.idusuario where d.id = ? and u.exclusao is null", [id]);
		});
	}

	private static async obterOcorrenciaInterno(sql: app.Sql, id: number, idusuario: number, admin: boolean, apenasNaoConcluida: boolean, apenasAncora: boolean, idocorrencia?: number, data?: number): Promise<false | DisciplinaOcorrencia> {
		if (!await Disciplina.usuarioTemDisciplinaInterno(sql, id, idusuario, admin, apenasAncora))
			return false;

		const params: any[] = [id];

		let query = "select id, iddisciplina, idusuario, data, limite, minimo, minimoMinutos, estado, qr1, qr2, qr3, qr4, timestampqr from disciplina_ocorrencia where iddisciplina = ?";

		if (apenasNaoConcluida)
			query += " and estado < 99";

		if (idocorrencia) {
			query += " and id = ?";
			params.push(idocorrencia);
		}

		if (data) {
			query += " and data = ?";
			params.push(data);
		}

		const lista: DisciplinaOcorrencia[] = await sql.query(query, params);

		return (lista && lista[0]) || null;
	}

	public static obterOcorrenciaNaoConcluida(id: number, idusuario: number, admin: boolean): Promise<false | DisciplinaOcorrencia> {
		return app.sql.connect(async (sql) => {
			return await Disciplina.obterOcorrenciaInterno(sql, id, idusuario, admin, true, true);
		});
	}

	public static async obterOcorrenciaConcluidaPorData(id: number, data: number, idusuario: number, admin: boolean): Promise<string | DisciplinaOcorrencia> {
		if (!id || !data)
			return "Dados inválidos";

		return app.sql.connect(async (sql) => {
			const o = await Disciplina.obterOcorrenciaInterno(sql, id, idusuario, admin, false, false, 0, data);

			if (o === false)
				return "Sem permissão para controlar a verificação de presença da disciplina";

			if (!o)
				return "Verificação de presença não encontrada";

			if (o.estado < 99)
				return "A verificação de presença da aula do dia " + DataUtil.converterDataISO(DataUtil.converterNumeroParaISO(o.data), true) + " ainda está em andamento";

			return o;
		});
	}

	public static async obterTodasOcorrenciasConcluidas(id: number, idusuario: number, admin: boolean): Promise<string | DisciplinaOcorrencia[]> {
		if (!id)
			return "Dados inválidos";

		return app.sql.connect(async (sql) => {
			if (!await Disciplina.usuarioTemDisciplinaInterno(sql, id, idusuario, admin, false))
				return "Sem permissão para controlar a verificação de presença da disciplina";

			const lista: DisciplinaOcorrencia[] = await sql.query("select id, iddisciplina, idusuario, data, limite, minimo, minimoMinutos from disciplina_ocorrencia where iddisciplina = ? and estado = 99 order by data asc", [id]);

			if (!lista || !lista.length)
				return "Nenhuma verificação de presença concluída foi encontrada na disciplina";

			return lista;
		});
	}

	public static async iniciarOcorrencia(idusuario: number, admin: boolean, ocorrencia: DisciplinaOcorrencia): Promise<string | DisciplinaOcorrencia> {
		if (!ocorrencia)
			return "Dados inválidos";

		ocorrencia.iddisciplina = parseInt(ocorrencia.iddisciplina as any);
		if (isNaN(ocorrencia.iddisciplina))
			return "Disciplina inválida";

		ocorrencia.data = parseInt(ocorrencia.data as any);
		const data = DataUtil.converterDataISO(DataUtil.converterNumeroParaISO(ocorrencia.data));
		if (!data)
			return "Data inválida";

		ocorrencia.limite = parseInt(ocorrencia.limite as any);
		if (isNaN(ocorrencia.limite) || ocorrencia.limite < 0 || ocorrencia.limite > 8)
			return "Quantidade total de verificações de presença inválida";

		ocorrencia.minimo = parseInt(ocorrencia.minimo as any);
		if (isNaN(ocorrencia.minimo) || ocorrencia.minimo < 0 || ocorrencia.minimo > 8 || ocorrencia.minimo > ocorrencia.limite || (ocorrencia.limite && !ocorrencia.minimo))
			return "Quantidade mínima obrigatória de verificações de presença inválida";

		ocorrencia.minimoMinutos = parseInt(ocorrencia.minimoMinutos as any);
		if (isNaN(ocorrencia.minimoMinutos) || ocorrencia.minimoMinutos < 1 || ocorrencia.minimoMinutos > 300)
			return "Permanência mínima em minutos inválida";

		return app.sql.connect(async (sql) => {
			const o = await Disciplina.obterOcorrenciaInterno(sql, ocorrencia.iddisciplina, idusuario, admin, true, true);

			if (o === false)
				return "Sem permissão para controlar a verificação de presença da disciplina";

			if (o)
				return "A verificação de presença da aula do dia " + DataUtil.converterDataISO(DataUtil.converterNumeroParaISO(o.data), true) + " ainda está em andamento";

			try {
				await sql.query("insert into disciplina_ocorrencia (iddisciplina, idusuario, data, limite, minimo, minimoMinutos, estado, qr1, qr2, qr3, qr4, timestampqr) values (?, ?, ?, ?, ?, ?, 1, 0, 0, 0, 0, 0)", [ocorrencia.iddisciplina, idusuario, ocorrencia.data, ocorrencia.limite, ocorrencia.minimo, ocorrencia.minimoMinutos]);

				ocorrencia.id = await sql.scalar("select last_insert_id()") as number;

				return {
					id: ocorrencia.id,
					iddisciplina: ocorrencia.iddisciplina,
					idusuario: idusuario,
					data: ocorrencia.data,
					limite: ocorrencia.limite,
					minimo: ocorrencia.minimo,
					minimoMinutos: ocorrencia.minimoMinutos,
					estado: 1,
					qr1: 0,
					qr2: 0,
					qr3: 0,
					qr4: 0
				};
			} catch (e) {
				if (e.code) {
					switch (e.code) {
						case "ER_DUP_ENTRY":
							return "A verificação de presença da aula do dia " + DataUtil.converterDataISO(DataUtil.converterNumeroParaISO(ocorrencia.data), true) + " já foi encerrada";
						default:
							throw e;
					}
				} else {
					throw e;
				}
			}			
		});
	}

	public static async alterarLimiteOcorrencia(idusuario: number, admin: boolean, ocorrencia: DisciplinaOcorrencia): Promise<string | DisciplinaOcorrencia> {
		if (!ocorrencia)
			return "Dados inválidos";

		ocorrencia.id = parseInt(ocorrencia.id as any);
		if (isNaN(ocorrencia.id))
			return "Id inválido";

		ocorrencia.iddisciplina = parseInt(ocorrencia.iddisciplina as any);
		if (isNaN(ocorrencia.iddisciplina))
			return "Disciplina inválida";

		ocorrencia.estado = parseInt(ocorrencia.estado as any);

		ocorrencia.limite = parseInt(ocorrencia.limite as any);
		if (isNaN(ocorrencia.limite) || ocorrencia.limite < 0 || ocorrencia.limite > 8)
			return "Quantidade total de verificações de presença inválida";

		ocorrencia.minimo = parseInt(ocorrencia.minimo as any);
		if (isNaN(ocorrencia.minimo) || ocorrencia.minimo < 0 || ocorrencia.minimo > 8 || ocorrencia.minimo > ocorrencia.limite || (ocorrencia.limite && !ocorrencia.minimo))
			return "Quantidade mínima obrigatória de verificações de presença inválida";

		ocorrencia.minimoMinutos = parseInt(ocorrencia.minimoMinutos as any);
		if (isNaN(ocorrencia.minimoMinutos) || ocorrencia.minimoMinutos < 1 || ocorrencia.minimoMinutos > 300)
			return "Permanência mínima em minutos inválida";

		ocorrencia.qr1 = parseInt(ocorrencia.qr1 as any);

		return app.sql.connect(async (sql) => {
			// Para permitir ajustes pós-aula
			//const o = await Disciplina.obterOcorrenciaInterno(sql, ocorrencia.iddisciplina, idusuario, admin, true);
			const o = await Disciplina.obterOcorrenciaInterno(sql, ocorrencia.iddisciplina, idusuario, admin, false, true, ocorrencia.id);

			if (o === false)
				return "Sem permissão para controlar a verificação de presença da disciplina";

			// Para permitir ajustes pós-aula
			//if (!o)
			//	return "Nenhuma verificação de presença em andamento";
			//
			//if (o.id !== ocorrencia.id)
			//	return "Só é permitido alterar a quantidade limite de verificações de presença da aula mais recente, ainda em andamento, da disciplina";
			if (!o)
				return "Verificação de presença não encontrada";

			if (o.estado !== ocorrencia.estado ||
				o.qr1 !== ocorrencia.qr1)
				return "Por favor, atualize a página pois ela parece estar desatualizada";

			if (!ocorrencia.limite && o.estado === 1 && !o.qr1) {
				// Deve aceitar esse caso, porque pode ser que o usuário esteja alterando
				// apenas o limite de tempo, ou tenha desistido de cobrar a validação do QR,
				// logo no início da aula (antes de gerar o primeiro QR, mas depois de ter
				// efetivamente iniciado a aula).
				// Em qualquer outro estado, o limite não pode voltar para 0!
			} else if ((o.qr1 && (ocorrencia.limite < o.estado)) || (ocorrencia.limite < (o.estado - 1))) {
				return "A quantidade limite de verificações de presença deve ser maior ou igual à quantidade de códigos QR já gerados";
			}

			o.limite = ocorrencia.limite;
			o.minimo = ocorrencia.minimo;
			o.minimoMinutos = ocorrencia.minimoMinutos;

			// Para permitir ajustes pós-aula
			//await sql.query("update disciplina_ocorrencia set limite = ?, minimo = ?, minimoMinutos = ? where id = ? and iddisciplina = ? and estado < 99", [o.limite, o.minimo, o.minimoMinutos, o.id, o.iddisciplina]);
			await sql.query("update disciplina_ocorrencia set limite = ?, minimo = ?, minimoMinutos = ? where id = ? and iddisciplina = ?", [o.limite, o.minimo, o.minimoMinutos, o.id, o.iddisciplina]);

			return (sql.affectedRows ? o : "Verificação de presença não encontrada");
		});
	}

	public static async proximoPasso(idusuario: number, admin: boolean, ocorrencia: DisciplinaOcorrencia): Promise<string | DisciplinaOcorrencia> {
		if (!ocorrencia)
			return "Dados inválidos";

		ocorrencia.id = parseInt(ocorrencia.id as any);
		if (isNaN(ocorrencia.id))
			return "Id inválido";

		ocorrencia.iddisciplina = parseInt(ocorrencia.iddisciplina as any);
		if (isNaN(ocorrencia.iddisciplina))
			return "Disciplina inválida";

		ocorrencia.estado = parseInt(ocorrencia.estado as any);
		if (isNaN(ocorrencia.estado))
			return "Estado inválido";

		ocorrencia.limite = parseInt(ocorrencia.limite as any);
		ocorrencia.minimo = parseInt(ocorrencia.minimo as any);
		ocorrencia.minimoMinutos = parseInt(ocorrencia.minimoMinutos as any);

		ocorrencia.qr1 = parseInt(ocorrencia.qr1 as any);
		if (isNaN(ocorrencia.qr1))
			return "Código QR inválido";

		return app.sql.connect(async (sql) => {
			const o = await Disciplina.obterOcorrenciaInterno(sql, ocorrencia.iddisciplina, idusuario, admin, true, true);

			if (o === false)
				return "Sem permissão para controlar a verificação de presença da disciplina";

			if (!o)
				return "Nenhuma verificação de presença em andamento";

			if (o.id !== ocorrencia.id)
				return "Só é permitido controlar a verificação de presença da aula mais recente, ainda em andamento, da disciplina";

			if (o.estado !== ocorrencia.estado ||
				o.limite !== ocorrencia.limite ||
				o.minimo !== ocorrencia.minimo ||
				o.minimoMinutos !== ocorrencia.minimoMinutos ||
				o.qr1 !== ocorrencia.qr1)
				return "Por favor, atualize a página pois ela parece estar desatualizada";

			let timestampqr: number;

			if (o.qr1 || o.estado > o.limite) {
				// Bloqueia esse QR e avança para o próximo passo (eventualmente concluindo a aula)
				o.estado++;
				if (o.estado > o.limite)
					o.estado = 99;
				o.qr1 = 0;
				o.qr2 = 0;
				o.qr3 = 0;
				o.qr4 = 0;
				timestampqr = 0;
			} else {
				// Cria um novo QR
				while (!(o.qr1 = ((0x7fffffff * Math.random()) | 0))) {
				}
				while (!(o.qr2 = ((0x7fffffff * Math.random()) | 0))) {
				}
				while (!(o.qr3 = ((0x7fffffff * Math.random()) | 0))) {
				}
				while (!(o.qr4 = ((0x7fffffff * Math.random()) | 0))) {
				}
				timestampqr = Timestamp.agora();
			}

			await sql.query("update disciplina_ocorrencia set estado = ?, qr1 = ?, qr2 = ?, qr3 = ?, qr4 = ?, timestampqr = ? where id = ? and iddisciplina = ? and estado = ? and qr1 = ?", [o.estado, o.qr1, o.qr2, o.qr3, o.qr4, timestampqr, o.id, o.iddisciplina, ocorrencia.estado, ocorrencia.qr1]);

			return (sql.affectedRows ? o : "Verificação de presença não encontrada");
		});
	}

	public static async confirmarParticipacao(tokenQR: string, token: string): Promise<string | number> {
		if (!tokenQR || tokenQR.length !== 40)
			return "Código do QR inválido";

		const qr1 = parseInt(tokenQR.substring(0, 8), 16),
			qr2 = parseInt(tokenQR.substring(8, 16), 16),
			idocorrencia = parseInt(tokenQR.substring(16, 24), 16) ^ qr1,
			qr3 = parseInt(tokenQR.substring(24, 32), 16),
			qr4 = parseInt(tokenQR.substring(32, 40), 16);

		if (!qr1 || !qr2 || !qr3 || !qr4 || !idocorrencia)
			return "Código do QR inválido";

		const resposta = await app.request.json.get(appsettings.ssoToken + encodeURIComponent(token));
		if (!resposta.success || !resposta.result)
			return (resposta.result && resposta.result.toString()) || ("Erro de comunicação de rede: " + resposta.statusCode);

		const json = resposta.result;
		if (json.erro)
			return json.erro;

		const nome = (json.dados.nome || "").trim().toUpperCase(),
			emailAcademico = (json.dados.emailAcademico || "").trim().toLowerCase();

		let email = (json.dados.email || "").trim().toLowerCase();
		if (email === emailAcademico)
			email = null;

		if (!nome)
			return "Nome não encontrado para o e-mail " + emailAcademico;

		const ocorrencias: { idcurso: string, idsecao: string, ano: number, semestre: number, eletiva: number, nome: string, estado: number }[] = await app.sql.connect(async (sql) => {
			return await sql.query("select d.idcurso, d.idsecao, d.ano, d.semestre, d.eletiva, d.nome, dr.estado from disciplina_ocorrencia dr inner join disciplina d on d.id = dr.iddisciplina where dr.id = ? and dr.qr1 = ? and dr.qr2 = ? and dr.qr3 = ? and dr.qr4 = ? limit 1", [idocorrencia, qr1, qr2, qr3, qr4]);
		});

		if (!ocorrencias || !ocorrencias.length)
			return "Disciplina não encontrada ou prazo de validade do código QR expirado";

		const ocorrencia = ocorrencias[0];

		let raTurmas = await IntegracaoMicroservices.obterRATurma(emailAcademico, ocorrencia.idcurso, ocorrencia.ano, ocorrencia.semestre, ocorrencia.eletiva !== 0);

		if (!raTurmas || !raTurmas.length) {
			if (email)
				raTurmas = await IntegracaoMicroservices.obterRATurma(email, ocorrencia.idcurso, ocorrencia.ano, ocorrencia.semestre, ocorrencia.eletiva !== 0);
		}

		let raTurmasOK = false;
		let emplid: string | null = null;

		if (raTurmas) {
			for (let i = raTurmas.length - 1; i >= 0; i--) {
				raTurmas[i].class_section = (raTurmas[i].class_section || "").trim().toUpperCase();
				if (raTurmas[i].class_section === ocorrencia.idsecao) {
					if (!emplid)
						emplid = (raTurmas[i].emplid || "").trim();
					raTurmasOK = true;
					raTurmas.splice(i, 1);
					// Deixa passar por todos, para ajustar o class_section de todos, e
					// remover eventuais duplicidades
					//break;
				}
			}
			if (!raTurmasOK)
				raTurmas = null;
		}

		if ((ocorrencia.eletiva && !raTurmasOK) ||
			(!ocorrencia.eletiva && (!raTurmas || !raTurmas.length))) {
			if (emailAcademico) {
				if (email && email !== emailAcademico)
					return `RA não encontrado, ou matrícula não encontrada na disciplina ${ocorrencia.idsecao} - ${ocorrencia.nome} (${ocorrencia.ano}-${ocorrencia.semestre}), com os e-mails ${emailAcademico} e ${email}`;
				else
					return `RA não encontrado, ou matrícula não encontrada na disciplina ${ocorrencia.idsecao} - ${ocorrencia.nome} (${ocorrencia.ano}-${ocorrencia.semestre}), com o e-mail ${emailAcademico}`;
			} else if (email) {
				return `RA não encontrado, ou matrícula não encontrada na disciplina ${ocorrencia.idsecao} - ${ocorrencia.nome} (${ocorrencia.ano}-${ocorrencia.semestre}), com o e-mail ${email}`;
			} else {
				return "E-mail não encontrado";
			}
		}

		const ra = parseInt(emplid);
		if (!ra)
			return "RA inválido: " + emplid;

		return app.sql.connect(async (sql) => {
			await sql.query("insert into disciplina_ocorrencia_estudante (idocorrencia, estado, ra, email, emailalt, nome, turma, criacao) values (?, ?, ?, ?, ?, ?, ?, ?)", [idocorrencia, ocorrencia.estado, ra, emailAcademico, email, nome, (ocorrencia.eletiva ? ocorrencia.idsecao : raTurmas[0].class_section), DataUtil.horarioDeBrasiliaISOComHorario()]);

			const id = await sql.scalar("select last_insert_id()") as number;
			return (ocorrencia.eletiva ? -id : id);
		});
	}

	public static async obterParticipacoes(id: number, idocorrencia: number, idusuario: number, admin: boolean): Promise<string | any[]> {
		if (!id || !idocorrencia)
			return "Dados inválidos";

		return app.sql.connect(async (sql) => {
			const o = await Disciplina.obterOcorrenciaInterno(sql, id, idusuario, admin, false, false, idocorrencia);

			if (o === false)
				return "Sem permissão para controlar a verificação de presença da disciplina";

			if (!o)
				return "Verificação de presença não encontrada";

			if (o.estado < 99)
				return "A verificação de presença da aula do dia " + DataUtil.converterDataISO(DataUtil.converterNumeroParaISO(o.data), true) + " ainda está em andamento";

			return await sql.query("select estado, ra, email, emailalt, nome, turma from disciplina_ocorrencia_estudante where idocorrencia = ?", [o.id]);
		});
	}

	public static async obterInfoParticipacao(idparticipacao: number): Promise<any> {
		if (!idparticipacao)
			return null;

		return app.sql.connect(async (sql) => {
			const lista: Disciplina[] = await sql.query("select doe.estado, doe.ra, doe.email, doe.emailalt, doe.nome, doe.turma, date_format(doe.criacao, '%d/%m/%Y %H:%i:%s') criacao, dr.data, dr.iddisciplina, d.ano, d.semestre, d.idsecao, d.nome nomedisciplina from disciplina_ocorrencia_estudante doe inner join disciplina_ocorrencia dr on dr.id = doe.idocorrencia inner join disciplina d on d.id = dr.iddisciplina where doe.id = ?", [idparticipacao]);

			return (lista && lista[0]) || null;
		});
	}
};

export = Disciplina;
