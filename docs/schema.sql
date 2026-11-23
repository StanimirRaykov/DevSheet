-- DevSheet database schema (PostgreSQL)
-- GENERATED from the EF Core model. Do not edit by hand.
-- Regenerate: UPDATE_SCHEMA=1 dotnet test --filter SchemaScriptTests (from the api/ folder)

CREATE TABLE "Skills" (
    "Id" uuid NOT NULL,
    "Name" text NOT NULL,
    "EscoUri" text,
    CONSTRAINT "PK_Skills" PRIMARY KEY ("Id")
);


CREATE TABLE "Users" (
    "Id" uuid NOT NULL,
    "DisplayName" text NOT NULL,
    "Email" text,
    "AvatarUrl" text,
    "Slug" text NOT NULL,
    "IsPublished" boolean NOT NULL,
    "CreatedAt" timestamp with time zone NOT NULL,
    "OnboardingCompletedAt" timestamp with time zone,
    "OnboardingStep" integer NOT NULL,
    CONSTRAINT "PK_Users" PRIMARY KEY ("Id")
);


CREATE TABLE "SkillAliases" (
    "Id" uuid NOT NULL,
    "SkillId" uuid NOT NULL,
    "Alias" text NOT NULL,
    CONSTRAINT "PK_SkillAliases" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_SkillAliases_Skills_SkillId" FOREIGN KEY ("SkillId") REFERENCES "Skills" ("Id") ON DELETE CASCADE
);


CREATE TABLE "Certifications" (
    "Id" uuid NOT NULL,
    "UserId" uuid NOT NULL,
    "Name" text NOT NULL,
    "Issuer" text NOT NULL,
    "IssueDate" date,
    "Url" text,
    CONSTRAINT "PK_Certifications" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_Certifications_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
);


CREATE TABLE "Educations" (
    "Id" uuid NOT NULL,
    "UserId" uuid NOT NULL,
    "Institution" text NOT NULL,
    "Degree" text NOT NULL,
    "StartDate" date,
    "EndDate" date,
    CONSTRAINT "PK_Educations" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_Educations_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
);


CREATE TABLE "ExternalLogins" (
    "Id" uuid NOT NULL,
    "UserId" uuid NOT NULL,
    "Provider" character varying(20) NOT NULL,
    "ProviderKey" text NOT NULL,
    "Email" text,
    "CreatedAt" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_ExternalLogins" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_ExternalLogins_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
);


CREATE TABLE "GithubConnections" (
    "UserId" uuid NOT NULL,
    "GithubId" bigint NOT NULL,
    "Login" text NOT NULL,
    "EncryptedToken" text NOT NULL,
    "ConnectedAt" timestamp with time zone NOT NULL,
    "LastSyncedAt" timestamp with time zone,
    CONSTRAINT "PK_GithubConnections" PRIMARY KEY ("UserId"),
    CONSTRAINT "FK_GithubConnections_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
);


CREATE TABLE "GithubRepos" (
    "Id" uuid NOT NULL,
    "UserId" uuid NOT NULL,
    "GithubRepoId" bigint NOT NULL,
    "Name" text NOT NULL,
    "Description" text,
    "HtmlUrl" text NOT NULL,
    "Stars" integer NOT NULL,
    "IsFork" boolean NOT NULL,
    "PushedAt" timestamp with time zone,
    "LanguagesJson" text NOT NULL,
    "ETag" text,
    "SourceMissing" boolean NOT NULL,
    CONSTRAINT "PK_GithubRepos" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_GithubRepos_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
);


CREATE TABLE "Languages" (
    "Id" uuid NOT NULL,
    "UserId" uuid NOT NULL,
    "Name" text NOT NULL,
    "IsoCode" text,
    "IsMotherTongue" boolean NOT NULL,
    "Listening" integer,
    "Reading" integer,
    "SpokenInteraction" integer,
    "SpokenProduction" integer,
    "Writing" integer,
    CONSTRAINT "PK_Languages" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_Languages_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
);


CREATE TABLE "Profiles" (
    "Id" uuid NOT NULL,
    "UserId" uuid NOT NULL,
    "FullName" text NOT NULL,
    "Headline" text NOT NULL,
    "Summary" text NOT NULL,
    "Location" text NOT NULL,
    "Email" text NOT NULL,
    "Website" text NOT NULL,
    "ShowEmailPublicly" boolean NOT NULL,
    "ShowLocationPublicly" boolean NOT NULL,
    "AllowPublicCvDownload" boolean NOT NULL,
    CONSTRAINT "PK_Profiles" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_Profiles_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
);


CREATE TABLE "WorkExperiences" (
    "Id" uuid NOT NULL,
    "UserId" uuid NOT NULL,
    "Company" text NOT NULL,
    "Title" text NOT NULL,
    "StartDate" date NOT NULL,
    "EndDate" date,
    "Description" text NOT NULL,
    CONSTRAINT "PK_WorkExperiences" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_WorkExperiences_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
);


CREATE TABLE "Projects" (
    "Id" uuid NOT NULL,
    "UserId" uuid NOT NULL,
    "GithubRepoId" uuid,
    "TitleOverride" text,
    "DescriptionOverride" text,
    "Status" integer NOT NULL,
    "DisplayOrder" integer NOT NULL,
    CONSTRAINT "PK_Projects" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_Projects_GithubRepos_GithubRepoId" FOREIGN KEY ("GithubRepoId") REFERENCES "GithubRepos" ("Id"),
    CONSTRAINT "FK_Projects_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
);


CREATE TABLE "ProjectSkills" (
    "ProjectId" uuid NOT NULL,
    "SkillId" uuid NOT NULL,
    "Status" integer NOT NULL,
    CONSTRAINT "PK_ProjectSkills" PRIMARY KEY ("ProjectId", "SkillId"),
    CONSTRAINT "FK_ProjectSkills_Projects_ProjectId" FOREIGN KEY ("ProjectId") REFERENCES "Projects" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_ProjectSkills_Skills_SkillId" FOREIGN KEY ("SkillId") REFERENCES "Skills" ("Id") ON DELETE CASCADE
);


CREATE INDEX "IX_Certifications_UserId" ON "Certifications" ("UserId");


CREATE INDEX "IX_Educations_UserId" ON "Educations" ("UserId");


CREATE UNIQUE INDEX "IX_ExternalLogins_Provider_ProviderKey" ON "ExternalLogins" ("Provider", "ProviderKey");


CREATE INDEX "IX_ExternalLogins_UserId" ON "ExternalLogins" ("UserId");


CREATE UNIQUE INDEX "IX_GithubConnections_GithubId" ON "GithubConnections" ("GithubId");


CREATE UNIQUE INDEX "IX_GithubRepos_UserId_GithubRepoId" ON "GithubRepos" ("UserId", "GithubRepoId");


CREATE INDEX "IX_Languages_UserId" ON "Languages" ("UserId");


CREATE UNIQUE INDEX "IX_Profiles_UserId" ON "Profiles" ("UserId");


CREATE INDEX "IX_Projects_GithubRepoId" ON "Projects" ("GithubRepoId");


CREATE INDEX "IX_Projects_UserId" ON "Projects" ("UserId");


CREATE INDEX "IX_ProjectSkills_SkillId" ON "ProjectSkills" ("SkillId");


CREATE UNIQUE INDEX "IX_SkillAliases_Alias" ON "SkillAliases" ("Alias");


CREATE INDEX "IX_SkillAliases_SkillId" ON "SkillAliases" ("SkillId");


CREATE UNIQUE INDEX "IX_Skills_Name" ON "Skills" ("Name");


CREATE UNIQUE INDEX "IX_Users_Slug" ON "Users" ("Slug");


CREATE INDEX "IX_WorkExperiences_UserId" ON "WorkExperiences" ("UserId");
