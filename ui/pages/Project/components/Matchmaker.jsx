import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { Header, Icon, Popup, Label, Grid } from 'semantic-ui-react'
import styled from 'styled-components'

import { loadSavedVariants } from 'redux/rootReducer'
import { getIndividualsByGuid, getSortedIndividualsByFamily, getSavedVariantsIsLoading } from 'redux/selectors'
import DeleteButton from 'shared/components/buttons/DeleteButton'
import UpdateButton from 'shared/components/buttons/UpdateButton'
import { BooleanCheckbox, BaseSemanticInput } from 'shared/components/form/Inputs'
import { SubmissionGeneVariants, Phenotypes } from 'shared/components/panel/MatchmakerPanel'
import BaseFieldView from 'shared/components/panel/view-fields/BaseFieldView'
import { Alleles } from 'shared/components/panel/variants/VariantIndividuals'
import SortableTable, { SelectableTableFormInput } from 'shared/components/table/SortableTable'
import DataLoader from 'shared/components/DataLoader'
import { HorizontalSpacer, VerticalSpacer } from 'shared/components/Spacers'
import { ButtonLink, ColoredLabel } from 'shared/components/StyledComponents'
import { AFFECTED } from 'shared/utils/constants'
import { camelcaseToTitlecase } from 'shared/utils/stringUtils'

import { loadMmeMatches, updateMmeSubmission, updateMmeSubmissionStatus } from '../reducers'
import {
  getMatchmakerMatchesLoading,
  getIndividualTaggedVariants,
  getDefaultMmeSubmissionByIndividual,
  getMmeResultsByIndividual,
} from '../selectors'

const BreakWordLink = styled.a`
  word-break: break-all;
`

const MatchContainer = styled.div`
  word-break: break-all;
`

const PATIENT_CORE_FIELDS = ['id', 'contact', 'features', 'genomicFeatures']

const MATCH_STATUS_EDIT_FIELDS = [
  { name: 'weContacted', label: 'We Contacted Host', component: BooleanCheckbox, inline: true },
  { name: 'hostContacted', label: 'Host Contacted Us', component: BooleanCheckbox, inline: true },
  { name: 'flagForAnalysis', label: 'Flag for Analysis', component: BooleanCheckbox, inline: true },
  { name: 'deemedIrrelevant', label: 'Deemed Irrelevant', component: BooleanCheckbox, inline: true },
  { name: 'comments', label: 'Comments', component: BaseSemanticInput, inputType: 'TextArea', rows: 5 },
]

const variantSummary = variant => (
  <span>
    {variant.chrom}:{variant.pos}
    {variant.alt && <span> {variant.ref} <Icon fitted name="angle right" /> {variant.alt}</span>}
  </span>
)

const GENOTYPE_FIELDS = [
  { name: 'geneSymbol', content: 'Gene', width: 2 },
  { name: 'xpos', content: 'Variant', width: 3, format: val => variantSummary(val) },
  { name: 'numAlt', content: 'Genotype', width: 2, format: val => <Alleles variant={val} numAlt={val.numAlt} /> },
  {
    name: 'tags',
    content: 'Tags',
    width: 8,
    format: val => val.tags.map(tag =>
      <ColoredLabel key={tag.tagGuid}size="small" color={tag.color} horizontal content={tag.name} />,
    ),
  },
]

const BaseEditGenotypesTable = ({ familyGuids, savedVariants, loading, load, value, onChange }) =>
  <DataLoader contentId={familyGuids} content load={load} loading={false}>
    <SelectableTableFormInput
      idField="variantId"
      defaultSortColumn="xpos"
      columns={GENOTYPE_FIELDS}
      data={savedVariants}
      value={value}
      onChange={newValue => onChange(savedVariants.filter(variant => newValue[variant.variantId]))}
      loading={loading}
    />
  </DataLoader>

BaseEditGenotypesTable.propTypes = {
  familyGuids: PropTypes.array,
  savedVariants: PropTypes.array,
  loading: PropTypes.bool,
  load: PropTypes.func,
  value: PropTypes.object,
  onChange: PropTypes.func,
}

const mapGenotypesStateToProps = (state, ownProps) => {
  const individualGuid = ownProps.meta.form.split('_-_')[0]
  return {
    familyGuids: [getIndividualsByGuid(state)[individualGuid].familyGuid],
    savedVariants: getIndividualTaggedVariants(state, { individualGuid }),
    loading: getSavedVariantsIsLoading(state),
  }
}

const mapGenotypesDispatchToProps = {
  load: loadSavedVariants,
}

const EditGenotypesTable = connect(mapGenotypesStateToProps, mapGenotypesDispatchToProps)(BaseEditGenotypesTable)

const PHENOTYPE_FIELDS = [
  { name: 'id', content: 'HPO ID', width: 3 },
  { name: 'label', content: 'Description', width: 9 },
  {
    name: 'observed',
    content: 'Observed?',
    width: 3,
    textAlign: 'center',
    format: val =>
      <Icon name={val.observed === 'yes' ? 'check' : 'remove'} color={val.observed === 'yes' ? 'green' : 'red'} />,
  },
]

const BaseEditPhenotypesTable = ({ individual, value, onChange }) =>
  <SelectableTableFormInput
    idField="id"
    defaultSortColumn="label"
    columns={PHENOTYPE_FIELDS}
    data={individual.phenotipsData.features}
    value={value}
    onChange={newValue => onChange(individual.phenotipsData.features.filter(feature => newValue[feature.id]))}
  />

BaseEditPhenotypesTable.propTypes = {
  individual: PropTypes.object,
  value: PropTypes.object,
  onChange: PropTypes.func,
}

const mapPhenotypeStateToProps = (state, ownProps) => ({
  individual: getIndividualsByGuid(state)[ownProps.meta.form.split('_-_')[0]],
})

const EditPhenotypesTable = connect(mapPhenotypeStateToProps)(BaseEditPhenotypesTable)

const CONTACT_URL_REGEX = /^mailto:[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}(,\s*[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{1,4})*$/i
const SUBMISSION_EDIT_FIELDS = [
  { name: 'patient.contact.name', label: 'Contact Name' },
  {
    name: 'patient.contact.href',
    label: 'Contact URL',
    parse: val => `mailto:${val}`,
    format: val => val.replace('mailto:', ''),
    validate: val => (CONTACT_URL_REGEX.test(val) ? undefined : 'Invalid contact url'),
  },
  {
    name: 'geneVariants',
    component: EditGenotypesTable,
    format: value => (value || []).reduce((acc, variant) =>
      ({ ...acc, [variant.variantId || `${variant.chrom}-${variant.pos}-${variant.ref}-${variant.alt}`]: true }), {}),
  },
  {
    name: 'phenotypes',
    component: EditPhenotypesTable,
    format: value => value.reduce((acc, feature) => ({ ...acc, [feature.id]: true }), {}),
    validate: (val, allValues) => ((val && val.length) || (allValues.geneVariants && allValues.geneVariants.length) ?
      undefined : 'Genotypes and/or phenotypes are required'),
  },
]

const contactedLabel = (val) => {
  if (val.hostContacted) {
    return 'Host Contacted Us'
  }
  return val.weContacted ? 'We Contacted Host' : 'Not Contacted'
}

const BaseMatchStatus = ({ initialValues, onSubmit }) =>
  <BaseFieldView
    initialValues={initialValues}
    field="matchStatus"
    idField="matchmakerResultGuid"
    compact
    isEditable
    showErrorPanel
    modalTitle="Edit MME Submission Status"
    formFields={MATCH_STATUS_EDIT_FIELDS}
    onSubmit={onSubmit}
    fieldDisplay={val =>
      <div>
        <Label horizontal content={contactedLabel(val)} color={val.hostContacted || val.weContacted ? 'green' : 'orange'} />
        {val.flagForAnalysis && <Label horizontal content="Flag for Analysis" color="purple" />}
        {val.deemedIrrelevant && <Label horizontal content="Deemed Irrelevant" color="red" />}
        <p>{val.comments}</p>
      </div>}
  />

BaseMatchStatus.propTypes = {
  initialValues: PropTypes.object,
  onSubmit: PropTypes.func,
}

const mapStatusDispatchToProps = {
  onSubmit: updateMmeSubmissionStatus,
}

const MatchStatus = connect(null, mapStatusDispatchToProps)(BaseMatchStatus)

const DISPLAY_FIELDS = [
  {
    name: 'id',
    width: 2,
    content: 'Match',
    verticalAlign: 'top',
    format: (val) => {
      const patientFields = Object.keys(val.patient).filter(k => val.patient[k] && !PATIENT_CORE_FIELDS.includes(k))
      return patientFields.length ? <Popup
        header="Patient Details"
        trigger={<MatchContainer>{val.id} <Icon link name="info circle" /></MatchContainer>}
        content={patientFields.map(k =>
          <div key={k}>
            <b>{camelcaseToTitlecase(k)}:</b> {k === 'disorders' ? val.patient[k].map(({ id }) => id).join(', ') : val.patient[k]}
          </div>,
        )}
      /> : <MatchContainer>{val.id}</MatchContainer>
    },
  },
  {
    name: 'createdDate',
    width: 1,
    content: 'First Seen',
    verticalAlign: 'top',
    format: val => new Date(val.createdDate).toLocaleDateString(),
  },
  {
    name: 'contact',
    width: 3,
    content: 'Contact',
    verticalAlign: 'top',
    format: ({ patient }) => patient.contact &&
      <div>
        <div><b>{patient.contact.institution}</b></div>
        <div>{patient.contact.name}</div>
        <BreakWordLink href={patient.contact.href}>{patient.contact.href.replace('mailto:', '')}</BreakWordLink>
      </div>,
  },
  {
    name: 'geneVariants',
    width: 2,
    content: 'Genes',
    verticalAlign: 'top',
    format: val => <SubmissionGeneVariants geneVariants={val.geneVariants} modalId={val.id} />,
  },
  {
    name: 'phenotypes',
    width: 4,
    content: 'Phenotypes',
    verticalAlign: 'top',
    format: val => <Phenotypes phenotypes={val.phenotypes} />,
  },
  {
    name: 'comments',
    width: 4,
    content: 'Follow Up Status',
    verticalAlign: 'top',
    format: initialValues => <MatchStatus initialValues={initialValues} />,
  },
]

const BaseMatchmakerIndividual = ({ loading, load, searchMme, individual, onSubmit, defaultMmeSubmission, mmeResults }) =>
  <div>
    <Header size="medium" content={individual.individualId} dividing />
    {individual.mmeSubmittedData && !individual.mmeDeletedDate &&
      <Grid padded>
        <Grid.Row>
          <Grid.Column width={2}><b>Submitted Genotypes:</b></Grid.Column>
          <Grid.Column width={14}>
            {individual.mmeSubmittedData.geneVariants.length ?
              <SubmissionGeneVariants
                geneVariants={individual.mmeSubmittedData.geneVariants}
                modalId="submission"
                horizontal
              /> : <i>None</i>}
          </Grid.Column>
        </Grid.Row>
        <Grid.Row>
          <Grid.Column width={2}><b>Submitted Phenotypes:</b></Grid.Column>
          <Grid.Column width={14}>
            {individual.mmeSubmittedData.phenotypes.length ?
              <Phenotypes phenotypes={individual.mmeSubmittedData.phenotypes} horizontal /> : <i>None</i>}
          </Grid.Column>
        </Grid.Row>
      </Grid>
    }
    {individual.mmeSubmittedDate && !individual.mmeDeletedDate ?
      <DataLoader content load={load} loading={false}>
        <ButtonLink
          disabled={!individual.mmeResultGuids}
          onClick={searchMme}
          icon="search"
          labelPosition="right"
          content="Search for New Matches"
        />|<HorizontalSpacer width={10} />
        <UpdateButton
          disabled={!individual.mmeSubmittedData}
          buttonText="Update Submission"
          modalSize="large"
          modalTitle={`Update Submission for ${individual.individualId}`}
          modalId={`${individual.individualGuid}_-_updateMmeSubmission`}
          confirmDialog="Are you sure you want to update this submission?"
          initialValues={individual.mmeSubmittedData}
          formFields={SUBMISSION_EDIT_FIELDS}
          onSubmit={onSubmit}
          showErrorPanel
        />|<HorizontalSpacer width={10} />
        <DeleteButton
          disabled={!individual.mmeSubmittedData}
          onSubmit={onSubmit}
          buttonText="Delete Submission"
          confirmDialog="Are you sure you want to remove this patient from the Matchmaker Exchange"
        />
        <SortableTable
          basic="very"
          fixed
          idField="id"
          defaultSortColumn="createdDate"
          defaultSortDescending
          columns={DISPLAY_FIELDS}
          data={mmeResults}
          loading={loading}
        />
      </DataLoader> :
      <div>
        <Header
          size="small"
          content="This individual has no submissions"
          icon={<Icon name="warning sign" color="orange" />}
          subheader={
            <div className="sub header">
              <UpdateButton
                initialValues={defaultMmeSubmission}
                buttonText="Submit to Matchmaker"
                editIconName=" "
                modalSize="large"
                modalTitle={`Create Submission for ${individual.individualId}`}
                modalId={`${individual.individualGuid}_-_createMmeSubmission`}
                confirmDialog="Are you sure you want to submit this individual?"
                formFields={SUBMISSION_EDIT_FIELDS}
                onSubmit={onSubmit}
                showErrorPanel
              />
            </div>}
        />
        <VerticalSpacer height={10} />
      </div>}
  </div>

BaseMatchmakerIndividual.propTypes = {
  individual: PropTypes.object.isRequired,
  loading: PropTypes.bool,
  load: PropTypes.func,
  searchMme: PropTypes.func,
  onSubmit: PropTypes.func,
  defaultMmeSubmission: PropTypes.object,
  mmeResults: PropTypes.array,
}

const mapStateToProps = (state, ownProps) => ({
  loading: getMatchmakerMatchesLoading(state),
  defaultMmeSubmission: getDefaultMmeSubmissionByIndividual(state, ownProps)[ownProps.individual.individualGuid],
  mmeResults: getMmeResultsByIndividual(state, ownProps)[ownProps.individual.individualGuid],
})

const mapDispatchToProps = (dispatch, ownProps) => {
  return {
    load: () => {
      return dispatch(loadMmeMatches(ownProps.individual.individualGuid, false))
    },
    searchMme: () => {
      return dispatch(loadMmeMatches(ownProps.individual.individualGuid, true))
    },
    onSubmit: (values) => {
      return dispatch(updateMmeSubmission({ ...values, individualGuid: ownProps.individual.individualGuid }))
    },
  }
}

const MatchmakerIndividual = connect(mapStateToProps, mapDispatchToProps)(BaseMatchmakerIndividual)

const Matchmaker = ({ individuals }) =>
  individuals.filter(individual => individual.affected === AFFECTED).map(individual =>
    <MatchmakerIndividual key={individual.individualGuid} individual={individual} />,
  )

Matchmaker.propTypes = {
  individuals: PropTypes.array,
}

const mapIndividualsStateToProps = (state, ownProps) => ({
  individuals: getSortedIndividualsByFamily(state)[ownProps.match.params.familyGuid],
})

export default connect(mapIndividualsStateToProps)(Matchmaker)