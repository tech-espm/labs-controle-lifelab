CREATE DATABASE IF NOT EXISTS controlelifelab DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_0900_ai_ci;
USE controlelifelab;

-- DROP TABLE IF EXISTS perfil;
CREATE TABLE perfil (
  id int NOT NULL,
  nome varchar(50) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY nome_UN (nome)
);

-- Manter sincronizado com enums/perfil.ts e models/perfil.ts
INSERT INTO perfil (id, nome) VALUES (1, 'Administrador'), (2, 'Professor');

-- DROP TABLE IF EXISTS usuario;
CREATE TABLE usuario (
  id int NOT NULL AUTO_INCREMENT,
  email varchar(100) NOT NULL,
  nome varchar(100) NOT NULL,
  idperfil int NOT NULL,
  token char(32) DEFAULT NULL,
  exclusao datetime NULL,
  criacao datetime NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY usuario_email_UN (email),
  KEY usuario_exclusao_IX (exclusao),
  KEY usuario_idperfil_FK_IX (idperfil),
  KEY usuario_nome_IX (nome),
  CONSTRAINT usuario_idperfil_FK FOREIGN KEY (idperfil) REFERENCES perfil (id) ON DELETE RESTRICT ON UPDATE RESTRICT
);

INSERT INTO usuario (email, nome, idperfil, token, criacao) VALUES ('admin@espm.br', 'Administrador', 1, NULL, NOW());

CREATE TABLE disciplina (
  id int NOT NULL AUTO_INCREMENT,
  idsistema varchar(32) NOT NULL,
  idcurso varchar(16) NOT NULL,
  idsecao varchar(16) NOT NULL,
  idcatalogo varchar(16) NOT NULL,
  ano smallint NOT NULL,
  semestre tinyint NOT NULL,
  nome varchar(100) NOT NULL,
  exclusao datetime NULL,
  criacao datetime NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY disciplina_idsistema_UN (idsistema),
  KEY disciplina_ano_semestre_exclusao_IX (ano, semestre, exclusao),
  KEY disciplina_exclusao_IX (exclusao)
);

CREATE TABLE disciplina_usuario (
  id int NOT NULL AUTO_INCREMENT,
  iddisciplina int NOT NULL,
  idusuario int NOT NULL,
  ancora tinyint NOT NULL,
  turma varchar(16) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY disciplina_usuario_iddisciplina_idusuario_UN (iddisciplina, idusuario),
  KEY disciplina_usuario_idusuario_IX (idusuario),
  CONSTRAINT disciplina_usuario_iddisciplina_FK FOREIGN KEY (iddisciplina) REFERENCES disciplina (id) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT disciplina_usuario_idusuario_FK FOREIGN KEY (idusuario) REFERENCES usuario (id) ON DELETE CASCADE ON UPDATE RESTRICT
);

CREATE TABLE disciplina_ocorrencia {
  id int NOT NULL AUTO_INCREMENT,
  iddisciplina int NOT NULL,
  idusuario int NOT NULL,
  data int NOT NULL,
  limite tinyint NOT NULL,
  estado tinyint NOT NULL,
  qr1 int NOT NULL,
  qr2 int NOT NULL,
  qr3 int NOT NULL,
  qr4 int NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY disciplina_ocorrencia_data_iddisciplina_UN (data, iddisciplina),
  KEY disciplina_ocorrencia_iddisciplina_estado_IX (iddisciplina, estado)
}

CREATE TABLE estudante (
  id int NOT NULL AUTO_INCREMENT,
  ra int NOT NULL,
  email varchar(100) NOT NULL,
  emailalt varchar(100) NOT NULL,
  nome varchar(100) NOT NULL,
  criacao datetime NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY estudante_ra_UN (ra)
);
