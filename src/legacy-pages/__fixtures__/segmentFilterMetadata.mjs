// A real slice of this Mautic instance's segment filter metadata, as the
// bridge returns it. Kept outside __tests__ so the project's
// `node --test src/pages/__tests__/*` glob still matches only test files.

export const segmentFilterMetadata = {
  "source": "runtime-mautic-segment-filter-choices",
  "objects": [
    "lead",
    "company"
  ],
  "glue": [
    {
      "value": "and",
      "label": "and"
    },
    {
      "value": "or",
      "label": "or"
    }
  ],
  "operators": [
    {
      "value": "=",
      "label": "equals",
      "requiresValue": true,
      "multiple": false
    },
    {
      "value": "!=",
      "label": "not equal",
      "requiresValue": true,
      "multiple": false
    },
    {
      "value": "gt",
      "label": "greater than",
      "requiresValue": true,
      "multiple": false
    },
    {
      "value": "gte",
      "label": "greater than or equal",
      "requiresValue": true,
      "multiple": false
    },
    {
      "value": "lt",
      "label": "less than",
      "requiresValue": true,
      "multiple": false
    },
    {
      "value": "lte",
      "label": "less than or equal",
      "requiresValue": true,
      "multiple": false
    },
    {
      "value": "empty",
      "label": "empty",
      "requiresValue": false,
      "multiple": false
    },
    {
      "value": "!empty",
      "label": "not empty",
      "requiresValue": false,
      "multiple": false
    },
    {
      "value": "like",
      "label": "like",
      "requiresValue": true,
      "multiple": false
    },
    {
      "value": "!like",
      "label": "not like",
      "requiresValue": true,
      "multiple": false
    },
    {
      "value": "between",
      "label": "between",
      "requiresValue": true,
      "multiple": false
    },
    {
      "value": "!between",
      "label": "not between",
      "requiresValue": true,
      "multiple": false
    },
    {
      "value": "in",
      "label": "including any of",
      "requiresValue": true,
      "multiple": true
    },
    {
      "value": "!in",
      "label": "excluding any of",
      "requiresValue": true,
      "multiple": true
    },
    {
      "value": "in_all",
      "label": "including all of",
      "requiresValue": true,
      "multiple": true
    },
    {
      "value": "!in_all",
      "label": "excluding all of",
      "requiresValue": true,
      "multiple": true
    },
    {
      "value": "regexp",
      "label": "regexp",
      "requiresValue": true,
      "multiple": false
    },
    {
      "value": "!regexp",
      "label": "not regexp",
      "requiresValue": true,
      "multiple": false
    },
    {
      "value": "date",
      "label": "date",
      "requiresValue": true,
      "multiple": false
    },
    {
      "value": "startsWith",
      "label": "starts with",
      "requiresValue": true,
      "multiple": false
    },
    {
      "value": "endsWith",
      "label": "ends with",
      "requiresValue": true,
      "multiple": false
    },
    {
      "value": "contains",
      "label": "contains",
      "requiresValue": true,
      "multiple": false
    }
  ],
  "fields": [
    {
      "alias": "city",
      "object": "lead",
      "label": "City",
      "type": "text",
      "group": null,
      "operators": [
        {
          "value": "=",
          "label": "equals"
        },
        {
          "value": "!=",
          "label": "not equal"
        },
        {
          "value": "empty",
          "label": "empty"
        },
        {
          "value": "!empty",
          "label": "not empty"
        },
        {
          "value": "like",
          "label": "like"
        },
        {
          "value": "!like",
          "label": "not like"
        },
        {
          "value": "in",
          "label": "including any of"
        },
        {
          "value": "!in",
          "label": "excluding any of"
        },
        {
          "value": "regexp",
          "label": "regexp"
        },
        {
          "value": "!regexp",
          "label": "not regexp"
        },
        {
          "value": "startsWith",
          "label": "starts with"
        },
        {
          "value": "endsWith",
          "label": "ends with"
        },
        {
          "value": "contains",
          "label": "contains"
        }
      ],
      "control": "text",
      "multiple": false
    },
    {
      "alias": "country",
      "object": "lead",
      "label": "Country",
      "type": "country",
      "group": null,
      "operators": [
        {
          "value": "=",
          "label": "equals"
        },
        {
          "value": "!=",
          "label": "not equal"
        },
        {
          "value": "empty",
          "label": "empty"
        },
        {
          "value": "!empty",
          "label": "not empty"
        },
        {
          "value": "in",
          "label": "including any of"
        },
        {
          "value": "!in",
          "label": "excluding any of"
        },
        {
          "value": "regexp",
          "label": "regexp"
        },
        {
          "value": "!regexp",
          "label": "not regexp"
        }
      ],
      "control": "select",
      "multiple": false,
      "choiceMode": "remote",
      "choices": [],
      "choiceSource": {
        "type": "country",
        "searchable": true
      }
    },
    {
      "alias": "device_brand",
      "object": "lead",
      "label": "Device Brand",
      "type": "device_brand",
      "group": null,
      "operators": [
        {
          "value": "empty",
          "label": "empty"
        },
        {
          "value": "!empty",
          "label": "not empty"
        },
        {
          "value": "in",
          "label": "including any of"
        },
        {
          "value": "!in",
          "label": "excluding any of"
        },
        {
          "value": "in_all",
          "label": "including all of"
        },
        {
          "value": "!in_all",
          "label": "excluding all of"
        }
      ],
      "control": "select",
      "multiple": false,
      "choiceMode": "remote",
      "choices": [],
      "choiceSource": {
        "type": "segment_field",
        "searchable": true,
        "scope": {
          "object": "lead",
          "field": "device_brand",
          "fieldType": "device_brand"
        }
      },
      "choiceCount": 2106
    },
{
      "alias": "state",
      "object": "lead",
      "label": "State",
      "type": "region",
      "group": null,
      "operators": [
        {
          "value": "=",
          "label": "equals"
        },
        {
          "value": "!=",
          "label": "not equal"
        },
        {
          "value": "empty",
          "label": "empty"
        },
        {
          "value": "!empty",
          "label": "not empty"
        },
        {
          "value": "in",
          "label": "including any of"
        },
        {
          "value": "!in",
          "label": "excluding any of"
        },
        {
          "value": "regexp",
          "label": "regexp"
        },
        {
          "value": "!regexp",
          "label": "not regexp"
        }
      ],
      "control": "select",
      "multiple": false,
      "choiceMode": "remote",
      "choices": [],
      "choiceSource": {
        "type": "region",
        "searchable": true
      }
    },
    {
      "alias": "points",
      "object": "lead",
      "label": "Points (+/-)",
      "type": "number",
      "group": null,
      "operators": [
        {
          "value": "=",
          "label": "equals"
        },
        {
          "value": "!=",
          "label": "not equal"
        },
        {
          "value": "gt",
          "label": "greater than"
        },
        {
          "value": "gte",
          "label": "greater than or equal"
        },
        {
          "value": "lt",
          "label": "less than"
        },
        {
          "value": "lte",
          "label": "less than or equal"
        },
        {
          "value": "empty",
          "label": "empty"
        },
        {
          "value": "!empty",
          "label": "not empty"
        },
        {
          "value": "like",
          "label": "like"
        },
        {
          "value": "!like",
          "label": "not like"
        },
        {
          "value": "regexp",
          "label": "regexp"
        },
        {
          "value": "!regexp",
          "label": "not regexp"
        },
        {
          "value": "startsWith",
          "label": "starts with"
        },
        {
          "value": "endsWith",
          "label": "ends with"
        },
        {
          "value": "contains",
          "label": "contains"
        }
      ],
      "control": "number",
      "multiple": false
    },
    {
      "alias": "leadlist",
      "object": "lead",
      "label": "Segment Membership",
      "type": "leadlist",
      "group": null,
      "operators": [
        {
          "value": "empty",
          "label": "empty"
        },
        {
          "value": "!empty",
          "label": "not empty"
        },
        {
          "value": "in",
          "label": "including any of"
        },
        {
          "value": "!in",
          "label": "excluding any of"
        },
        {
          "value": "in_all",
          "label": "including all of"
        },
        {
          "value": "!in_all",
          "label": "excluding all of"
        }
      ],
      "control": "select",
      "multiple": false,
      "choiceMode": "inline",
      "choices": [
        {
          "value": "8",
          "label": "ECP Marketing QA Updated"
        },
        {
          "value": "7",
          "label": "ECP Native Segment QA"
        },
        {
          "value": "3",
          "label": "IMAA Deal Alert"
        },
        {
          "value": "1",
          "label": "IMAA Eventsss"
        },
        {
          "value": "2",
          "label": "IMAA Pharma M&A News"
        },
        {
          "value": "10",
          "label": "QA Campaign Builder Segment"
        },
        {
          "value": "9",
          "label": "Subscription Sync QA"
        },
        {
          "value": "4",
          "label": "test"
        },
        {
          "value": "5",
          "label": "Test Category"
        },
        {
          "value": "6",
          "label": "Test mautic test"
        }
      ],
      "choiceCount": 10
    },
    {
      "alias": "tags",
      "object": "lead",
      "label": "Tags",
      "type": "tags",
      "group": null,
      "operators": [
        {
          "value": "empty",
          "label": "empty"
        },
        {
          "value": "!empty",
          "label": "not empty"
        },
        {
          "value": "in",
          "label": "including any of"
        },
        {
          "value": "!in",
          "label": "excluding any of"
        },
        {
          "value": "in_all",
          "label": "including all of"
        },
        {
          "value": "!in_all",
          "label": "excluding all of"
        }
      ],
      "control": "select",
      "multiple": true,
      "choiceMode": "inline",
      "choices": [
        {
          "value": "1",
          "label": "Hiii"
        },
        {
          "value": "4",
          "label": "QA Campaign Builder Tag"
        }
      ],
      "choiceCount": 2
    },
    {
      "alias": "companycity",
      "object": "company",
      "label": "City",
      "type": "text",
      "group": null,
      "operators": [
        {
          "value": "=",
          "label": "equals"
        },
        {
          "value": "!=",
          "label": "not equal"
        },
        {
          "value": "empty",
          "label": "empty"
        },
        {
          "value": "!empty",
          "label": "not empty"
        },
        {
          "value": "like",
          "label": "like"
        },
        {
          "value": "!like",
          "label": "not like"
        },
        {
          "value": "in",
          "label": "including any of"
        },
        {
          "value": "!in",
          "label": "excluding any of"
        },
        {
          "value": "regexp",
          "label": "regexp"
        },
        {
          "value": "!regexp",
          "label": "not regexp"
        },
        {
          "value": "startsWith",
          "label": "starts with"
        },
        {
          "value": "endsWith",
          "label": "ends with"
        },
        {
          "value": "contains",
          "label": "contains"
        }
      ],
      "control": "text",
      "multiple": false
    }
  ]
};

export default segmentFilterMetadata;
