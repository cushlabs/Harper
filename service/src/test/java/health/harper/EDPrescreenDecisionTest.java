package health.harper;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.is;

/**
 * Unit tests for the ED Prescreen DMN decision (endpoint POST /EDPrescreen).
 * Keys are the DMN input-data / decision names; adjust to the generated OpenAPI if needed.
 */
@QuarkusTest
class EDPrescreenDecisionTest {

    private static final String CT = "application/json";

    @Test
    void adolescentInBand_withStandingOrderAndHighRisk_isScreened() {
        given().contentType(CT)
            .body("{\"Standing order for survey administration?\": true, \"High risk chief complaint?\": true, \"Age in years\": 16}")
        .when().post("/EDPrescreen")
        .then().statusCode(200)
            .body("'ED Prescreen'", is(true));
    }

    @Test
    void ageOutsideValidatedBand_isNotScreened() {
        given().contentType(CT)
            .body("{\"Standing order for survey administration?\": true, \"High risk chief complaint?\": true, \"Age in years\": 20}")
        .when().post("/EDPrescreen")
        .then().statusCode(200)
            .body("'ED Prescreen'", is(false));
    }

    @Test
    void noHighRiskChiefComplaint_isNotScreened() {
        given().contentType(CT)
            .body("{\"Standing order for survey administration?\": true, \"High risk chief complaint?\": false, \"Age in years\": 15}")
        .when().post("/EDPrescreen")
        .then().statusCode(200)
            .body("'ED Prescreen'", is(false));
    }
}
