migrate(
  (app) => {
    const team = app.findCollectionByNameOrId('raiox_team')
    let account = null
    try {
      account = app.findAuthRecordByEmail('raiox_team', 'jose@simbiosia.com.br')
    } catch (_) {
      account = app.findAuthRecordByEmail('raiox_team', 'jose.aquino@simbiosia.com.br')
    }
    account.setEmail('jose.aquino@simbiosia.com.br')
    account.set('name', 'José Aquino')
    app.save(account)
    team.authRule =
      "verified = true && team_member = true && (email = 'jose.aquino@simbiosia.com.br' || email = 'evandro@simbiosia.com.br')"
    app.save(team)
  },
  (app) => {
    const team = app.findCollectionByNameOrId('raiox_team')
    const account = app.findAuthRecordByEmail('raiox_team', 'jose.aquino@simbiosia.com.br')
    account.setEmail('jose@simbiosia.com.br')
    app.save(account)
    team.authRule =
      "verified = true && team_member = true && (email = 'jose@simbiosia.com.br' || email = 'evandro@simbiosia.com.br')"
    app.save(team)
  },
)
