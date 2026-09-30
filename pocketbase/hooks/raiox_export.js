routerAdd(
  'GET',
  '/backend/v1/raiox-export.csv',
  (e) => {
    const auth = e.auth
    if (
      !auth ||
      !auth.verified() ||
      String(auth.getEmail() || '')
        .trim()
        .toLowerCase() !== 'jose@simbiosia.com.br' ||
      auth.getBool('team_member') !== true
    ) {
      return e.forbiddenError('Acesso restrito a José Aquino.')
    }
    const records = $app.findRecordsByFilter('raiox_submissions', '', '-created', 10000, 0)
    const escapeCsv = (value) => '"' + String(value == null ? '' : value).replace(/"/g, '""') + '"'
    const lines = ['Nome,E-mail,Percurso,Data,Status do envio']
    records.forEach((record) => {
      lines.push(
        [
          escapeCsv(record.getString('name')),
          escapeCsv(record.getString('email')),
          escapeCsv(record.getString('journey')),
          escapeCsv(record.getString('created')),
          escapeCsv(record.getString('email_status')),
        ].join(','),
      )
    })
    const csv = '\\uFEFF' + lines.join('\\r\\n')
    return e.blob(200, 'text/csv; charset=utf-8', toBytes(csv))
  },
  $apis.requireAuth(),
)
