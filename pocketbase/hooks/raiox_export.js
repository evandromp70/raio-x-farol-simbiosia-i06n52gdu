routerAdd('GET', '/backend/v1/raiox-export', (e) => {
  const auth = e.auth
  if (
    !auth ||
    auth.getBool('verified') !== true ||
    String(auth.getString('email') || '')
      .trim()
      .toLowerCase() !== 'jose@simbiosia.com.br' ||
    auth.getBool('team_member') !== true
  ) {
    return e.forbiddenError('Acesso restrito à equipe autorizada.')
  }

  const escapeCsv = (value) => {
    let text = String(value == null ? '' : value)
    const first = text.trim().charAt(0)
    if (['=', '+', '-', '@'].indexOf(first) >= 0) text = "'" + text
    return '"' + text.replace(/"/g, '""') + '"'
  }
  const lines = ['Nome,E-mail']
  const pageSize = 500
  let offset = 0
  let page = []
  do {
    page = $app.findRecordsByFilter('raiox_submissions', '', '-created', pageSize, offset)
    page.forEach((record) => {
      lines.push(
        [escapeCsv(record.getString('name')), escapeCsv(record.getString('email'))].join(','),
      )
    })
    offset += page.length
  } while (page.length === pageSize)

  const csv = '\uFEFF' + lines.join('\r\n') + '\r\n'
  e.response.header().set('Content-Disposition', 'attachment; filename="leads-raio-x-farol.csv"')
  e.response.header().set('Cache-Control', 'no-store, private')
  return e.blob(200, 'text/csv; charset=utf-8', toBytes(csv))
})
