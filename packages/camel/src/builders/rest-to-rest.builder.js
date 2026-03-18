"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRestToRestRoute = buildRestToRestRoute;
const yaml = __importStar(require("js-yaml"));
/**
 * Builds a Camel YAML DSL route for a REST-to-REST integration.
 *
 * Architecture note: this builder generates a Camel route that:
 *   1. Accepts an HTTP trigger (or can be adapted for scheduler)
 *   2. Fetches data from the source REST endpoint
 *   3. Applies field mappings via Camel Simple/JSTL expressions
 *   4. Posts to the target REST endpoint
 *
 * The generated YAML is stored as the release artifact and consumed by
 * the camel-runner service for execution.
 */
function buildRestToRestRoute(params) {
    const mappingSteps = params.fieldMappings.map((m) => {
        const base = {
            setHeader: {
                name: `Mapped-${m.targetField}`,
                simple: `\${body[${m.sourceField}]}`,
            },
        };
        // For date format transforms, add a conversion step
        if (m.transformType === 'DATE_FORMAT' && m.transformConfig) {
            return [
                base,
                {
                    log: {
                        message: `Transforming ${m.sourceField} → ${m.targetField} (DATE_FORMAT)`,
                        loggingLevel: 'DEBUG',
                    },
                },
            ];
        }
        return [base];
    });
    const route = [
        {
            route: {
                id: params.routeId,
                description: params.description,
                from: {
                    uri: 'platform-http:/api/invoke',
                    parameters: { httpMethodRestrict: params.httpMethod },
                },
                steps: [
                    { log: { message: 'Integration triggered: ${headers.CamelHttpMethod} ${headers.CamelHttpPath}', loggingLevel: 'INFO' } },
                    // Fetch from source
                    {
                        toD: {
                            uri: `${params.sourceBaseUrl}${params.sourcePath}`,
                            parameters: { httpMethod: 'GET' },
                        },
                    },
                    { log: { message: 'Source response received', loggingLevel: 'INFO' } },
                    // Apply field mapping steps (flattened)
                    ...mappingSteps.flat(),
                    // Post to target
                    {
                        toD: {
                            uri: `${params.targetBaseUrl}${params.targetPath}`,
                            parameters: { httpMethod: 'POST' },
                        },
                    },
                    { log: { message: 'Delivered to target', loggingLevel: 'INFO' } },
                ],
            },
        },
    ];
    return yaml.dump(route, { lineWidth: 120, noRefs: true });
}
//# sourceMappingURL=rest-to-rest.builder.js.map