migrate(
  (app) => {
    const submissions = new Collection({
      name: 'raiox_submissions',
      type: 'base',
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'submission_key', type: 'text', required: true, max: 64 },
        { name: 'name', type: 'text', required: true, max: 200 },
        { name: 'email', type: 'email', required: true },
        {
          name: 'journey',
          type: 'select',
          required: true,
          values: ['executivo', 'empresa'],
          maxSelect: 1,
        },
        {
          name: 'email_status',
          type: 'select',
          required: true,
          values: ['pending', 'sent', 'failed'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_raiox_submissions_submission_key ON raiox_submissions (submission_key)',
        'CREATE INDEX idx_raiox_submissions_created ON raiox_submissions (created DESC)',
        'CREATE INDEX idx_raiox_submissions_email ON raiox_submissions (email)',
      ],
    })
    app.save(submissions)

    const team = new Collection({
      name: 'raiox_team',
      type: 'auth',
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      manageRule: null,
      authRule:
        "verified = true && team_member = true && (email = 'jose@simbiosia.com.br' || email = 'evandro@simbiosia.com.br')",
      resetPasswordTemplate: {
        subject: 'Defina sua senha de acesso — Simbiosia',
        body: '<p>Olá, {NAME}.</p><p>Use este link para definir ou redefinir sua senha de acesso à exportação de leads do Raio-X FAROL:</p><p><a href="{RESET_URL}">Definir senha</a></p><p>Se você não solicitou este acesso, ignore esta mensagem.</p>',
      },
      fields: [
        { name: 'name', type: 'text', max: 120 },
        { name: 'team_member', type: 'bool' },
      ],
    })
    app.save(team)

    const jose = new Record(team)
    jose.setEmail('jose@simbiosia.com.br')
    jose.setPassword($security.randomString(48) + 'A7!')
    jose.setVerified(true)
    jose.set('name', 'José Aquino')
    jose.set('team_member', true)
    app.save(jose)

    const evandro = new Record(team)
    evandro.setEmail('evandro@simbiosia.com.br')
    evandro.setPassword($security.randomString(48) + 'B8!')
    evandro.setVerified(true)
    evandro.set('name', 'Evandro Pereira')
    evandro.set('team_member', true)
    app.save(evandro)
  },
  (app) => {
    try {
      app.delete(app.findAuthRecordByEmail('raiox_team', 'jose@simbiosia.com.br'))
    } catch (_) {}
    try {
      app.delete(app.findAuthRecordByEmail('raiox_team', 'evandro@simbiosia.com.br'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('raiox_team'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('raiox_submissions'))
    } catch (_) {}
  },
)
