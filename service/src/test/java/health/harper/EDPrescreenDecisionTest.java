package health.harper;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.is;

/**
 * Unit tests for the ED Prescreen DMN decision (endpoint POST /EDPrescreen).
 * DMN node names are camelCase identifiers, so the JSON context keys are camelCase.
 */
@QuarkusTest
class EDPrescreenDecisionTest {

    private static final String CT = "application/json";

    @Test
    void adolescentInBand_withStandingOrderAndHighRisk_isScreened() {
        given().contentType(CT)
            .body("{\"standingOrder\": true, \"highRiskChiefComplaint\": true, \"ageInYears\": 16}")
        .when().post("/EDPrescreen")
        .then().statusCode(200)
            .body("shouldScreen", is(true));
    }

    @Test
    void ageOutsideValidatedBand_isNotScreened() {
        given().contentType(CT)
            .body("{\"standingOrder\": true, \"highRiskChiefComplaint\": true, \"ageInYears\": 20}")
        .when().post("/EDPrescreen")
        .then().statusCode(200)
            .body("shouldScreen", is(false));
    }

    @Test
    void noHighRiskChiefComplaint_isNotScreened() {
        given().contentType(CT)
            .body("{\"standingOrder\": true, \"highRiskChiefComplaint\": false, \"ageInYears\": 15}")
        .when().post("/EDPrescreen")
        .then().statusCode(200)
            .body("shouldScreen", is(false));
    }
}
