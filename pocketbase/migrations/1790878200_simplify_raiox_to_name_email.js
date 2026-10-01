migrate(
  (app) => {
    app
      .db()
      .newQuery(
        'DELETE FROM raiox_submissions WHERE id NOT IN (SELECT MIN(id) FROM raiox_submissions GROUP BY lower(trim(email)))',
      )
      .execute()
    const submissions = app.findCollectionByNameOrId('raiox_submissions')
    submissions.fields.removeByName('submission_key')
    submissions.fields.removeByName('journey')
    submissions.fields.removeByName('email_status')
    submissions.removeIndex('idx_raiox_submissions_submission_key')
    submissions.removeIndex('idx_raiox_submissions_created')
    submissions.removeIndex('idx_raiox_submissions_email')
    submissions.addIndex('idx_raiox_submissions_email', true, 'email', '')
    app.save(submissions)
  },
  (app) => {
    const submissions = app.findCollectionByNameOrId('raiox_submissions')
    submissions.fields.add(new TextField({ name: 'submission_key', required: false, max: 64 }))
    submissions.fields.add(
      new SelectField({
        name: 'journey',
        required: false,
        values: ['executivo', 'empresa'],
        maxSelect: 1,
      }),
    )
    submissions.fields.add(
      new SelectField({
        name: 'email_status',
        required: false,
        values: ['pending', 'sent', 'failed'],
        maxSelect: 1,
      }),
    )
    submissions.addIndex('idx_raiox_submissions_submission_key', true, 'submission_key', '')
    submissions.addIndex('idx_raiox_submissions_created', false, 'created DESC', '')
    app.save(submissions)
  },
)
